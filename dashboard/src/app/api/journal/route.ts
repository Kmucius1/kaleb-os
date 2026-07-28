import { supabase } from "@/lib/supabase";
import { z } from "zod";

// Journal entries. The three daily moments (morning identity / midday
// execution / evening reflection) plus the ad-hoc kinds.
//
// Migration 0024 adds moment/transcript/mood/energy/pillar/tags/entities. Until
// it is applied, the insert falls back to the original column set rather than
// failing — so capture never breaks, it just stores less.

const Body = z.object({
  content: z.string().trim().min(1).max(20000),
  moment: z
    .enum(["morning", "midday", "evening", "trading", "idea", "gratitude", "win", "lesson", "freeform"])
    .optional(),
  kind: z.string().max(40).optional(),
  transcript: z.string().max(40000).optional(),
  mood: z.string().max(40).optional(),
  energy: z.number().int().min(1).max(5).optional(),
  pillar: z.string().max(20).optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
});

const EXTENDED_COLUMN_ERROR = /column .* does not exist|schema cache/i;

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "content required" }, { status: 400 });
  }
  const b = parsed.data;
  const kind = b.kind || b.moment || "reflection";

  const full = {
    content: b.content,
    kind,
    moment: b.moment ?? null,
    transcript: b.transcript ?? null,
    mood: b.mood ?? null,
    energy: b.energy ?? null,
    pillar: b.pillar ?? null,
    tags: b.tags ?? null,
  };

  let res = await supabase.from("journal").insert(full).select("id").single();

  if (res.error && EXTENDED_COLUMN_ERROR.test(res.error.message)) {
    // Pre-0024 schema — keep the entry, drop the enrichment.
    res = await supabase
      .from("journal")
      .insert({ content: b.content, kind, mood: b.mood ?? null })
      .select("id")
      .single();
    if (!res.error) {
      return Response.json({ ok: true, id: res.data?.id, degraded: true });
    }
  }

  if (res.error) return Response.json({ error: res.error.message }, { status: 500 });
  return Response.json({ ok: true, id: res.data?.id });
}
