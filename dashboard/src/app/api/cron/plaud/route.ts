import { supabase } from "@/lib/supabase";
import { ingestTranscript } from "@/lib/ingest";
import { plaudAccessToken, plaudListFiles, plaudTranscript } from "@/lib/plaud";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

// Cap transcript probes per run so a large library can't blow maxDuration.
const MAX_PROBES = 60;
// How many pages of the file list to walk (100/page) before giving up.
const MAX_PAGES = 5;

// Always-on PLAUD sync — runs on the Vercel cron every 30 min with NO laptop or
// Claude session. Pulls recordings straight from PLAUD's API using the rotating
// refresh token, dedups against plaud_ingested, and files each new one through
// the same ingest engine the MCP pipe uses.
//
// DEDUP RULE (important): plaud_ingested is a ledger of recordings we have
// FINISHED with — nothing else. A recording that PLAUD hasn't transcribed yet is
// NEVER written there, so it is re-checked on every run and files itself the
// moment PLAUD produces a transcript. Previously this used a 48h grace measured
// from `start_at` (when the audio was RECORDED), which permanently discarded any
// backlog dump: a meeting recorded in May and uploaded in August was already
// months "old" on its first sight, so it was dead-ended as empty before PLAUD
// had a chance to transcribe it, and never looked at again.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    const url = new URL(request.url);
    if (auth !== `Bearer ${secret}` && url.searchParams.get("key") !== secret) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const log: Record<string, unknown> = { filed: 0, skipped: 0, pending: 0, filed_nothing: 0, errors: 0 };
  try {
    const token = await plaudAccessToken();

    // Walk the whole library, not just the first 30 — a single dump off the
    // device can add more recordings than one page holds.
    const files = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const batch = await plaudListFiles(token, 100, page);
      files.push(...batch);
      if (batch.length < 100) break;
    }

    // Which have we already finished? (one query, then filter)
    const ids = files.map(f => f.id);
    const { data: done } = await supabase.from("plaud_ingested").select("file_id").in("file_id", ids);
    const seen = new Set((done ?? []).map(r => r.file_id));

    const results: { file_id: string; name: string; filed?: number; error?: string }[] = [];
    // Names of recordings waiting on PLAUD, so the stall is visible in the
    // heartbeat instead of hiding behind a reassuring "skipped" count.
    const waiting: string[] = [];
    let probes = 0;

    for (const f of files) {
      if (seen.has(f.id)) { log.skipped = (log.skipped as number) + 1; continue; }
      if (probes >= MAX_PROBES) { log.pending = (log.pending as number) + 1; continue; }
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

        const r = await ingestTranscript(transcript, `PLAUD: ${f.name || f.id}`);
        if (r.error) {
          // Filing failed (e.g. a transient OpenRouter error). Don't record it —
          // retry on the next run rather than losing the recording for good.
          log.errors = (log.errors as number) + 1;
          results.push({ file_id: f.id, name: f.name, error: r.error });
          continue;
        }

        // Filed nothing off a substantial transcript is suspicious, but retrying
        // burns a full LLM pass every 30 min forever — record it with a visible
        // marker instead so it can be reviewed by hand.
        const filedNothing = r.filed === 0 && transcript.length > 2000;
        if (filedNothing) log.filed_nothing = (log.filed_nothing as number) + 1;

        await supabase.from("plaud_ingested").insert({
          file_id: f.id, name: f.name ?? null,
          recorded_at: f.start_at ?? f.created_at ?? null,
          summary: filedNothing ? `(filed nothing off a ${transcript.length}-char transcript — review)\n\n${r.summary}` : r.summary,
          filed: r.filed,
        });
        log.filed = (log.filed as number) + 1;
        results.push({ file_id: f.id, name: f.name, filed: r.filed });
      } catch (e) {
        log.errors = (log.errors as number) + 1;
        results.push({ file_id: f.id, name: f.name, error: (e as Error).message });
      }
    }

    // Heartbeat so we can confirm the cron actually fires (and see what's stuck).
    await supabase.from("kalebos_config").upsert(
      {
        key: "plaud_sync_last",
        value: JSON.stringify({ at: new Date().toISOString(), listed: files.length, ...log, waiting_on_plaud: waiting.slice(0, 40) }),
      },
      { onConflict: "key" },
    );
    return Response.json({ ok: true, ...log, waiting_on_plaud: waiting, results });
  } catch (e) {
    await supabase.from("kalebos_config").upsert(
      { key: "plaud_sync_last", value: JSON.stringify({ at: new Date().toISOString(), error: (e as Error).message }) },
      { onConflict: "key" },
    ).then(() => {}, () => {});
    return Response.json({ ok: false, error: (e as Error).message, ...log }, { status: 200 });
  }
}
