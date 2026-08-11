import { ingestTranscript, ingestAuthorized } from "@/lib/ingest";

export const dynamic = "force-dynamic";
// A single 30k-char section of a long recording routinely takes over two
// minutes to file; 120s returned a platform error page instead of a result.
export const maxDuration = 300;

// POST /api/ingest/transcript  { transcript, source? }
// Turns a PLAUD recording / voice memo / brain-dump into filed Kaleb OS records.
export async function POST(request: Request) {
  try {
    if (!ingestAuthorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
    const { transcript, source } = await request.json().catch(() => ({}));
    if (!transcript || !String(transcript).trim()) {
      return Response.json({ error: "transcript required" }, { status: 400 });
    }
    const r = await ingestTranscript(String(transcript), source);
    if (r.error) return Response.json({ error: r.error }, { status: 502 });
    return Response.json({ summary: r.summary, filed: r.filed, actions: r.actions });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
