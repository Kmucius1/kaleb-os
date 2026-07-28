import { getHorizonLog, logHorizonWalk, removeHorizonWalk, todayET, weekDates } from '@/lib/rhythm/day'
import { horizonWeek } from '@/lib/rhythm/sun'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const Body = z.object({
  done: z.boolean(),
  window: z.enum(['sunrise', 'sunset']).optional(),
  // How it was confirmed. Location is only ever accepted when the client
  // already has explicit permission — this API never requests or infers it.
  method: z.enum(['manual', 'location', 'photo', 'voice', 'went']).optional(),
  mode: z.string().max(60).optional(),
  note: z.string().max(2000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'bad request' }, { status: 400 })
  const date = parsed.data.date ?? todayET()

  if (parsed.data.done) {
    await logHorizonWalk({
      date,
      window: parsed.data.window ?? 'sunset',
      method: parsed.data.method ?? 'manual',
      note: parsed.data.note,
    })
  } else {
    await removeHorizonWalk(date)
  }

  const week = weekDates(date)
  const log = await getHorizonLog(week[0], week[6])
  return Response.json({
    ok: true,
    date,
    done: parsed.data.done,
    week: horizonWeek(log.map(h => h.date), week, todayET()),
  })
}
