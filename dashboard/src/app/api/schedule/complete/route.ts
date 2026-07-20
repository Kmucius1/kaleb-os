import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Toggle a check-off. POST { ref_id, ref_type?, date, done }.
// done=true inserts (idempotent), done=false deletes.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const ref_id = String(body.ref_id || "");
    const ref_type = String(body.ref_type || "block");
    const done_date = String(body.date || "");
    const done = Boolean(body.done);
    if (!ref_id || !done_date) return Response.json({ error: "ref_id and date required" }, { status: 400 });

    if (done) {
      const { error } = await supabase
        .from("completions")
        .upsert({ ref_type, ref_id, done_date }, { onConflict: "ref_type,ref_id,done_date" });
      if (error) return Response.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await supabase
        .from("completions")
        .delete()
        .eq("ref_type", ref_type).eq("ref_id", ref_id).eq("done_date", done_date);
      if (error) return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json({ ok: true, done });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
