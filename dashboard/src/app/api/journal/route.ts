import { supabase } from "@/lib/supabase";

// POST /api/journal  { content, kind?, mood? }
export async function POST(request: Request) {
  try {
    const { content, kind, mood } = await request.json().catch(() => ({}));
    if (!content || !String(content).trim()) {
      return Response.json({ error: "content required" }, { status: 400 });
    }
    const { data, error } = await supabase.from("journal")
      .insert({ content: String(content).trim(), kind: kind || "meditation", mood: mood || null })
      .select("id").single();
    if (error) throw new Error(error.message);
    return Response.json({ ok: true, id: data?.id });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
