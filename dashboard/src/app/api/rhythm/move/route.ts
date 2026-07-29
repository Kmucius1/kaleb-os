import { getDayState, setDayState, resolveDay, todayET } from '@/lib/rhythm/day'
import { findConflicts } from '@/lib/rhythm/engine'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Move or resize one block on one day. Writes a per-day override — the
// recurring template is never touched, so tomorrow still starts from the rhythm.

const Body = z.object({
  key: z.string().min(1),
  start: z.number().int().min(0).max(1440),
  end: z.number().int().min(0).max(1440),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** Set by the undo button — skips the protected-block guard. */
  revert: z.boolean().optional(),
})

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'bad request' }, { status: 400 })

  const { key, start, end, revert } = parsed.data
  const date = parsed.data.date ?? todayET()
  if (end <= start) return Response.json({ error: 'end must be after start' }, { status: 400 })

  const day = await resolveDay(date)
  const block = day.blocks.find(b => b.key === key)
  if (!block) return Response.json({ error: 'unknown block' }, { status: 404 })

  // Protected blocks are Kaleb's law, not the engine's suggestion. Dragging one
  // needs an explicit decision, so the UI has to confirm before it gets here.
  if (block.flexibility === 'protected' && !revert) {
    return Response.json(
      { error: 'protected', message: `${block.title} is protected. Unlock it first if you really need it moved.` },
      { status: 409 }
    )
  }

  const floor = block.minMinutes ?? (block.end - block.start)
  if (end - start < floor) {
    return Response.json(
      { error: 'too_short', message: `${block.title} can't go below ${floor} minutes.` },
      { status: 409 }
    )
  }

  // The template's own times — `movedFrom` is set whenever an override is active.
  const original = block.movedFrom ?? { start: block.start, end: block.end }
  const backToTemplate = start === original.start && end === original.end

  const state = await getDayState(date)
  const overrides = { ...state.overrides }
  if (backToTemplate) {
    // Dropping the row rather than storing a no-op keeps the day honest: the
    // block reads as untouched instead of "moved from" its own start time.
    delete overrides[key]
  } else {
    overrides[key] = { start, end }
  }
  await setDayState(date, { ...state, overrides })

  // Report conflicts rather than silently reshuffling around the drop.
  const after = day.blocks.map(b => (b.key === key ? { ...b, start, end } : b))
  const conflicts = findConflicts(after.filter(b => b.status !== 'skipped' && b.kind !== 'sleep'))

  return Response.json({
    ok: true,
    key,
    start,
    end,
    previous: { start: block.start, end: block.end },
    conflicts: conflicts.filter(c => c.a === key || c.b === key),
  })
}
