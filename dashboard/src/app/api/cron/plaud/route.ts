import { supabase } from "@/lib/supabase";
import { ingestTranscript } from "@/lib/ingest";
import { plaudAccessToken, plaudListFiles, plaudTranscript } from "@/lib/plaud";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

// Always-on PLAUD sync — runs on the Vercel cron every 30 min with NO laptop or
// Claude session. Pulls recordings straight from PLAUD's API using the
// non-rotating refresh token, dedups against plaud_ingested, and files each new
// one through the same ingest engine the MCP pipe uses.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    const url = new URL(request.url);
    if (auth !== `Bearer ${secret}` && url.searchParams.get("key") !== secret) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  if (!process.env.PLAUD_REFRESH_TOKEN) {
    return Response.json({ ok: false, error: "PLAUD_REFRESH_TOKEN not set" }, { status: 200 });
  }

  const log: Record<string, unknown> = { filed: 0, skipped: 0, errors: 0 };
  try {
    const token = await plaudAccessToken();
    const files = await plaudListFiles(token, 30);

    // Which have we already filed? (one query, then filter)
    const ids = files.map(f => f.id);
    const { data: done } = await supabase.from("plaud_ingested").select("file_id").in("file_id", ids);
    const seen = new Set((done ?? []).map(r => r.file_id));

    const results: { file_id: string; name: string; filed?: number; error?: string }[] = [];
    for (const f of files) {
      if (seen.has(f.id)) { log.skipped = (log.skipped as number) + 1; continue; }
      try {
        const transcript = await plaudTranscript(token, f.id);
        if (!transcript.trim()) { // nothing usable — mark filed so we don't retry forever
          await supabase.from("plaud_ingested").insert({ file_id: f.id, name: f.name, recorded_at: f.start_at ?? null, summary: "(empty transcript)", filed: 0 });
          continue;
        }
        const r = await ingestTranscript(transcript, `PLAUD: ${f.name || f.id}`);
        await supabase.from("plaud_ingested").insert({
          file_id: f.id, name: f.name ?? null,
          recorded_at: f.start_at ?? f.created_at ?? null,
          summary: r.summary, filed: r.filed,
        });
        log.filed = (log.filed as number) + 1;
        results.push({ file_id: f.id, name: f.name, filed: r.filed });
      } catch (e) {
        log.errors = (log.errors as number) + 1;
        results.push({ file_id: f.id, name: f.name, error: (e as Error).message });
      }
    }
    // Heartbeat so we can confirm the cron actually fires (and see last activity).
    await supabase.from("kalebos_config").upsert(
      { key: "plaud_sync_last", value: JSON.stringify({ at: new Date().toISOString(), listed: files.length, ...log }) },
      { onConflict: "key" },
    );
    return Response.json({ ok: true, ...log, results });
  } catch (e) {
    await supabase.from("kalebos_config").upsert(
      { key: "plaud_sync_last", value: JSON.stringify({ at: new Date().toISOString(), error: (e as Error).message }) },
      { onConflict: "key" },
    ).then(() => {}, () => {});
    return Response.json({ ok: false, error: (e as Error).message, ...log }, { status: 200 });
  }
}
