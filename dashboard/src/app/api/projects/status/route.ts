import { supabase } from "@/lib/supabase";

// POST /api/projects/status  { repo, status?, pinned?, note? }
// Upserts Kaleb's manual overlay on a GitHub repo. status null/"" clears it.
const STATUSES = ["working", "live", "shelved", "idea"];

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const repo = String(body.repo || "");
    if (!repo.includes("/")) return Response.json({ error: "repo (full_name) required" }, { status: 400 });

    const patch: Record<string, unknown> = { repo, updated_at: new Date().toISOString() };
    if ("status" in body) {
      const s = body.status ? String(body.status) : null;
      if (s && !STATUSES.includes(s)) return Response.json({ error: "invalid status" }, { status: 400 });
      patch.status = s;
    }
    if ("pinned" in body) patch.pinned = Boolean(body.pinned);
    if ("note" in body) patch.note = body.note ? String(body.note) : null;

    const { data, error } = await supabase.from("project_status").upsert(patch, { onConflict: "repo" }).select().single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true, data });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
