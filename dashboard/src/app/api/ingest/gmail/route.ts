import { supabase } from "@/lib/supabase";
import { ingestAuthorized } from "@/lib/ingest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Gmail capture — the Vercel-side replacement for the n8n capture-gmail workflow.
// A Claude Routine reads unread inbox emails via the Gmail MCP connector and POSTs
// them here in a batch; we upsert each into raw_captures (dedup on source+source_id),
// exactly like the old n8n HTTP node did. raw_captures powers Atlas's email context.
//
// POST /api/ingest/gmail  { emails: [{ id, subject?, from?, date?, snippet?, text?, threadId? }] }
// Auth: INGEST_SECRET via `Authorization: Bearer <secret>` or `?key=<secret>`.

type Email = { id: string; subject?: string; from?: string; date?: string; snippet?: string; text?: string; threadId?: string };

export async function POST(request: Request) {
  try {
    if (!ingestAuthorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
    const { emails } = await request.json().catch(() => ({}));
    if (!Array.isArray(emails)) return Response.json({ error: "emails[] required" }, { status: 400 });

    const rows = emails
      .filter((e: Email) => e && e.id)
      .map((e: Email) => ({
        source: "gmail",
        source_id: String(e.id),
        content_type: "email",
        content_text: e.text || e.snippet || "",
        metadata: { subject: e.subject, from: e.from, date: e.date, snippet: e.snippet, threadId: e.threadId },
      }));
    if (!rows.length) return Response.json({ received: 0, upserted: 0 });

    // Ignore-duplicates upsert on the unique (source, source_id) — same as n8n.
    const { data, error } = await supabase
      .from("raw_captures")
      .upsert(rows, { onConflict: "source,source_id", ignoreDuplicates: true })
      .select("source_id");
    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({ received: rows.length, upserted: data?.length ?? 0 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
