import { supabase } from '@/lib/supabase'
import { etToday, getTodayCard, ROWS, writeTargetFor } from '@/lib/season'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const Body = z.object({
  row: z.string().min(1),
  /** Which unit of the row — meditation has two, content has two. */
  unit: z.number().int().min(0).max(9),
  done: z.boolean(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

// Tick one unit of one Today row off (or undo it).
//
// A row can be satisfied from a block check-off or a habit tap, and the card
// shouldn't need to know which. The mapping lives beside the row definitions in
// lib/season/score.ts, so the thing that writes and the thing that scores can
// never drift apart.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'bad request' }, { status: 400 })
  const { row, unit, done } = parsed.data
  const date = parsed.data.date ?? etToday()

  const def = ROWS.find(r => r.key === row)
  if (!def) return Response.json({ error: `unknown row "${row}"` }, { status: 400 })

  const target = writeTargetFor(row, unit)
  if (!target) return Response.json({ error: `row "${row}" has no unit ${unit}` }, { status: 400 })

  if (target.kind === 'block') {
    if (done) {
      const { error } = await supabase
        .from('completions')
        .upsert({ ref_type: 'block', ref_id: target.slug, done_date: date }, { onConflict: 'ref_type,ref_id,done_date' })
      if (error) return Response.json({ error: error.message }, { status: 500 })
    } else {
      const { error } = await supabase
        .from('completions')
        .delete()
        .match({ ref_type: 'block', ref_id: target.slug, done_date: date })
      if (error) return Response.json({ error: error.message }, { status: 500 })
    }
  } else {
    const { data: habit } = await supabase.from('habits').select('id').eq('name', target.name).maybeSingle()
    if (!habit) return Response.json({ error: `habit "${target.name}" not found` }, { status: 404 })

    // Tapping unit N means "N+1 of these are done"; untapping means N.
    const units = done ? unit + 1 : unit
    const { value, done: isDone } = target.unitsToValue(units)
    const { error } = await supabase.from('habit_logs').upsert(
      { habit_id: habit.id, log_date: date, value, done: isDone, updated_at: new Date().toISOString() },
      { onConflict: 'habit_id,log_date' },
    )
    if (error) return Response.json({ error: error.message }, { status: 500 })
  }

  // Hand back the recomputed card so the client never has to guess.
  return Response.json({ ok: true, card: await getTodayCard(date) })
}
