import { supabase } from '@/lib/supabase'
import { rankTopics, rankingSummary, type ScoredPost } from '@/lib/content/ranking'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// GET — the topic ranking, or an honest reason it isn't ready yet.
export async function GET() {
  const [{ data: posts }, { data: cfg }] = await Promise.all([
    supabase.from('content_posts')
      .select('topic,avg_watch_pct,saves,views,reach,followers_gained,profile_visits,posted_at')
      .order('posted_at', { ascending: false }).limit(500),
    supabase.from('kalebos_config').select('value').eq('key', 'topic_ranking_min_posts').maybeSingle(),
  ])
  const min = Number(cfg?.value) || 30
  const ranking = rankTopics((posts ?? []) as ScoredPost[], min)
  return Response.json({ ok: true, ranking, summary: rankingSummary(ranking) })
}

const Body = z.object({
  /** Either update an existing post, or create one from the idea it came from. */
  id: z.string().uuid().optional(),
  idea_id: z.string().uuid().optional(),
  platform: z.string().max(40).optional(),
  post_url: z.string().url().max(500).nullable().optional(),
  posted_at: z.string().datetime().optional(),
  topic: z.string().max(60).nullable().optional(),
  views: z.number().int().nonnegative().nullable().optional(),
  reach: z.number().int().nonnegative().nullable().optional(),
  watch_time_sec: z.number().int().nonnegative().nullable().optional(),
  avg_watch_pct: z.number().min(0).max(100).nullable().optional(),
  saves: z.number().int().nonnegative().nullable().optional(),
  shares: z.number().int().nonnegative().nullable().optional(),
  comments: z.number().int().nonnegative().nullable().optional(),
  likes: z.number().int().nonnegative().nullable().optional(),
  followers_gained: z.number().int().nonnegative().nullable().optional(),
  profile_visits: z.number().int().nonnegative().nullable().optional(),
})

// POST — record what a post did. Six numbers in the weekly review.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ error: 'bad request', detail: parsed.error.issues.slice(0, 3) }, { status: 400 })
  }
  const { id, idea_id, ...fields } = parsed.data
  const patch = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined))

  if (id) {
    const { error } = await supabase.from('content_posts').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true, id })
  }

  if (!idea_id) return Response.json({ error: 'Pass id (existing post) or idea_id (new one).' }, { status: 400 })

  // Inherit brand and topic from the idea, so the weekly entry is six numbers
  // rather than a form.
  const { data: idea } = await supabase.from('content_ideas').select('brand_id,pillar').eq('id', idea_id).maybeSingle()
  if (!idea) return Response.json({ error: 'No such idea.' }, { status: 404 })

  const { data, error } = await supabase.from('content_posts').insert({
    brand_id: idea.brand_id,
    idea_id,
    platform: patch.platform ?? 'reels',
    topic: patch.topic ?? idea.pillar,
    posted_at: patch.posted_at ?? new Date().toISOString(),
    ...patch,
  }).select('id').single()
  if (error) return Response.json({ error: error.message }, { status: 500 })

  await supabase.from('content_ideas').update({ status: 'posted' }).eq('id', idea_id)
  return Response.json({ ok: true, id: data.id })
}
