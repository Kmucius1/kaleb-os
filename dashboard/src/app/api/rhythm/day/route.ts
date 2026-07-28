import { resolveDay, toggleLock, weekDates, getHorizonLog, todayET } from '@/lib/rhythm/day'
import { supabase } from '@/lib/supabase'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// One resolved day (any date), plus a week roll-up for the week view.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const date = url.searchParams.get('date') ?? undefined
  const week = url.searchParams.get('week')

  try {
    if (week) {
      const dates = weekDates(week)
      const [comp, horizon] = await Promise.all([
        supabase.from('completions').select('ref_id,done_date').gte('done_date', dates[0]).lte('done_date', dates[6]),
        getHorizonLog(dates[0], dates[6]),
      ])
      const byDate: Record<string, string[]> = {}
      for (const d of dates) byDate[d] = []
      for (const c of comp.data ?? []) (byDate[c.done_date] ??= []).push(c.ref_id)
      return Response.json({ dates, completedByDate: byDate, horizon: horizon.map(h => h.date), today: todayET() })
    }

    const day = await resolveDay(date)
    return Response.json(day)
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}

const LockBody = z.object({
  key: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

// Long-press to lock a block: the engine then treats it as protected.
export async function POST(req: Request) {
  const parsed = LockBody.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'bad request' }, { status: 400 })
  const date = parsed.data.date ?? todayET()
  const locked = await toggleLock(date, parsed.data.key)
  return Response.json({ ok: true, locked })
}
