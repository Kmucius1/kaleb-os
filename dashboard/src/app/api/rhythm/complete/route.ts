import { supabase } from '@/lib/supabase'
import { todayET } from '@/lib/rhythm/day'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const Body = z.object({
  key: z.string().min(1),
  done: z.boolean(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

// Check a block off (or undo it). Completions are keyed by the block's stable
// slug + date, so they survive template edits and reseeds.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'bad request' }, { status: 400 })
  const { key, done } = parsed.data
  const date = parsed.data.date ?? todayET()

  if (done) {
    const { error } = await supabase
      .from('completions')
      .upsert({ ref_type: 'block', ref_id: key, done_date: date }, { onConflict: 'ref_type,ref_id,done_date' })
    if (error) return Response.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase
      .from('completions')
      .delete()
      .match({ ref_type: 'block', ref_id: key, done_date: date })
    if (error) return Response.json({ error: error.message }, { status: 500 })
  }
  return Response.json({ ok: true, key, done, date })
}
