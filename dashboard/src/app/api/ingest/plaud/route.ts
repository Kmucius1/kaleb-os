import { supabase } from "@/lib/supabase";
import { ingestTranscript, ingestAuthorized } from "@/lib/ingest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

// The PLAUD auto-pipe. PLAUD transcripts can only be read by an MCP client
// (Claude), so Claude drives the loop: list recordings, then for each new one
// fetch its transcript and POST it here. This endpoint owns DEDUP (so the same
// recording is never filed twice) and the actual filing.
//
// GET  /api/ingest/plaud            -> { ingested: [file_id, ...] }  (last 500, so Claude can skip done ones)
// POST /api/ingest/plaud  { file_id, name?, recorded_at?, transcript } -> idempotent file-one
// Auth: INGEST_SECRET via `Authorization: Bearer <secret>` or `?key=<secret>`.

export async function GET(request: Request) {
  if (!ingestAuthorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await supabase
    .from("plaud_ingested").select("file_id").order("ingested_at", { ascending: false }).limit(500);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ingested: (data ?? []).map(r => r.file_id) });
}

export async function POST(request: Request) {
  try {
    if (!ingestAuthorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
    const { file_id, name, recorded_at, transcript } = await request.json().catch(() => ({}));
    if (!file_id) return Response.json({ error: "file_id required" }, { status: 400 });

    // Dedup: already filed? Bail before spending tokens.
    const { data: existing } = await supabase
      .from("plaud_ingested").select("file_id").eq("file_id", String(file_id)).maybeSingle();
    if (existing) return Response.json({ skipped: true, file_id, reason: "already ingested" });

    if (!transcript || !String(transcript).trim()) {
      return Response.json({ error: "transcript required" }, { status: 400 });
    }

    const r = await ingestTranscript(String(transcript), `PLAUD: ${name || file_id}`);
    if (r.error) return Response.json({ error: r.error }, { status: 502 });

    // Record it so we never re-file this recording.
    const { error: insErr } = await supabase.from("plaud_ingested").insert({
      file_id: String(file_id),
      name: name ? String(name) : null,
      recorded_at: recorded_at ? new Date(recorded_at).toISOString() : null,
      summary: r.summary,
      filed: r.filed,
    });
    if (insErr) return Response.json({ error: `filed but not recorded: ${insErr.message}`, summary: r.summary, filed: r.filed }, { status: 500 });

    return Response.json({ ok: true, file_id, filed: r.filed, summary: r.summary, actions: r.actions });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
