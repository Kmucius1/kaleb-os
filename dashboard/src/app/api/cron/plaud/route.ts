import { supabase } from "@/lib/supabase";
import { ingestTranscript, chunkTranscript } from "@/lib/ingest";
import { plaudAccessToken, plaudListFiles, plaudTranscript } from "@/lib/plaud";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 800;

// Stop starting new work once this much of the run is gone, leaving room for the
// in-flight chunk to land and the heartbeat to be written.
const BUDGET_MS = 560_000;
// How much transcript to hand the model in one pass.
const CHUNK_CHARS = 30_000;
// Cap transcript probes per run so a large library can't eat the whole budget.
const MAX_PROBES = 60;
// How many pages of the file list to walk (100/page) before giving up.
const MAX_PAGES = 5;
// Where cross-run chunk progress lives (no migration needed).
const PROGRESS_KEY = "plaud_chunk_progress";

type Progress = { i: number; filed: number; len: number; summary: string };

// Always-on PLAUD sync — runs on the Vercel cron every 30 min with NO laptop or
// Claude session. Pulls recordings straight from PLAUD's API using the rotating
// refresh token, dedups against plaud_ingested, and files each new one through
// the same ingest engine the MCP pipe uses.
//
// DEDUP RULE (important): plaud_ingested is a ledger of recordings we have
// FINISHED with — nothing else. A recording PLAUD hasn't transcribed yet is
// NEVER written there, so it is re-checked on every run and files itself the
// moment the transcript appears. Previously this used a 48h grace measured from
// `start_at` (when the audio was RECORDED), which permanently discarded any
// backlog dump: a meeting recorded in May and uploaded in August was already
// months "old" on first sight, so it was dead-ended as empty before PLAUD had a
// chance to transcribe it, and never looked at again.
//
// SIZE RULE: a multi-hour meeting can exceed 300k characters and cannot be filed
// in one pass inside the function limit. Transcripts are split into chunks and
// filed a few at a time; progress is kept in kalebos_config so the next run
// resumes mid-recording instead of starting over (or timing out forever).
export async function GET(request: Request) {
  const t0 = Date.now();
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    const url = new URL(request.url);
    if (auth !== `Bearer ${secret}` && url.searchParams.get("key") !== secret) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const log: Record<string, unknown> = { filed: 0, skipped: 0, pending: 0, in_progress: 0, errors: 0 };
  const waiting: string[] = [];
  const results: { file_id: string; name: string; filed?: number; chunks?: string; error?: string }[] = [];

  // Load cross-run chunk progress up front; write it back once at the end.
  const { data: progRow } = await supabase.from("kalebos_config").select("value").eq("key", PROGRESS_KEY).maybeSingle();
  let progress: Record<string, Progress> = {};
  try { progress = progRow?.value ? JSON.parse(progRow.value) : {}; } catch { progress = {}; }

  const saveProgress = () =>
    supabase.from("kalebos_config").upsert({ key: PROGRESS_KEY, value: JSON.stringify(progress) }, { onConflict: "key" });

  try {
    const token = await plaudAccessToken();

    // Walk the whole library, not just the first page — a single dump off the
    // device can add more recordings than one page holds.
    const files = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const batch = await plaudListFiles(token, 100, page);
      files.push(...batch);
      if (batch.length < 100) break;
    }

    const ids = files.map(f => f.id);
    const { data: done } = await supabase.from("plaud_ingested").select("file_id").in("file_id", ids);
    const seen = new Set((done ?? []).map(r => r.file_id));

    // Finish partly-filed recordings before starting new ones, so a long meeting
    // can't be starved by a steady trickle of short ones.
    const queue = files.filter(f => !seen.has(f.id)).sort((a, b) => (progress[b.id] ? 1 : 0) - (progress[a.id] ? 1 : 0));
    log.skipped = files.length - queue.length;

    let probes = 0;
    for (const f of queue) {
      if (probes >= MAX_PROBES || Date.now() - t0 > BUDGET_MS) { log.pending = (log.pending as number) + 1; continue; }
      probes++;
      try {
        const transcript = await plaudTranscript(token, f.id);
        if (!transcript.trim()) {
          // PLAUD has the audio but no transcript yet (or the recording is
          // silent/too short). Leave it OUT of the ledger so it retries every
          // run — it costs one GET and self-heals the moment PLAUD catches up.
          log.pending = (log.pending as number) + 1;
          waiting.push(f.name || f.id);
          continue;
        }

        const chunks = chunkTranscript(transcript, CHUNK_CHARS);
        // If the transcript changed since we last saw it (PLAUD finished its
        // polished pass), the old chunk boundaries no longer line up — restart.
        let p = progress[f.id];
        if (!p || p.len !== transcript.length) p = { i: 0, filed: 0, len: transcript.length, summary: "" };

        let failed: string | undefined;
        while (p.i < chunks.length && Date.now() - t0 < BUDGET_MS) {
          const label = chunks.length > 1 ? ` (part ${p.i + 1}/${chunks.length})` : "";
          const r = await ingestTranscript(chunks[p.i], `PLAUD: ${f.name || f.id}${label}`);
          if (r.error) { failed = r.error; break; }
          p.filed += r.filed;
          p.summary = `${p.summary}${p.summary ? "\n" : ""}${r.summary}`.slice(-6000);
          p.i++;
        }

        if (failed) {
          // Filing failed (e.g. a transient OpenRouter error). Keep the progress
          // we made and retry the same chunk next run — never drop the recording.
          progress[f.id] = p;
          log.errors = (log.errors as number) + 1;
          results.push({ file_id: f.id, name: f.name, error: failed, chunks: `${p.i}/${chunks.length}` });
          continue;
        }

        if (p.i < chunks.length) {
          // Out of time mid-recording — resume here on the next run.
          progress[f.id] = p;
          log.in_progress = (log.in_progress as number) + 1;
          results.push({ file_id: f.id, name: f.name, chunks: `${p.i}/${chunks.length}` });
          continue;
        }

        // Every chunk filed — record it as finished and stop tracking progress.
        const filedNothing = p.filed === 0 && transcript.length > 2000;
        await supabase.from("plaud_ingested").insert({
          file_id: f.id, name: f.name ?? null,
          recorded_at: f.start_at ?? f.created_at ?? null,
          summary: filedNothing ? `(filed nothing off a ${transcript.length}-char transcript — review)\n\n${p.summary}` : p.summary,
          filed: p.filed,
        });
        delete progress[f.id];
        log.filed = (log.filed as number) + 1;
        results.push({ file_id: f.id, name: f.name, filed: p.filed, chunks: `${chunks.length}/${chunks.length}` });
      } catch (e) {
        log.errors = (log.errors as number) + 1;
        results.push({ file_id: f.id, name: f.name, error: (e as Error).message });
      }
    }

    await saveProgress();
    // Heartbeat so we can confirm the cron actually fires (and see what's stuck).
    await supabase.from("kalebos_config").upsert(
      {
        key: "plaud_sync_last",
        value: JSON.stringify({
          at: new Date().toISOString(), listed: files.length, took_s: Math.round((Date.now() - t0) / 1000),
          ...log, waiting_on_plaud: waiting.slice(0, 40),
        }),
      },
      { onConflict: "key" },
    );
    return Response.json({ ok: true, ...log, waiting_on_plaud: waiting, results });
  } catch (e) {
    await saveProgress().then(() => {}, () => {});
    await supabase.from("kalebos_config").upsert(
      { key: "plaud_sync_last", value: JSON.stringify({ at: new Date().toISOString(), error: (e as Error).message }) },
      { onConflict: "key" },
    ).then(() => {}, () => {});
    return Response.json({ ok: false, error: (e as Error).message, ...log }, { status: 200 });
  }
}
