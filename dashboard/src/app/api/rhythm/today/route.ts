import { resolveDay } from '@/lib/rhythm/day'

export const dynamic = 'force-dynamic'

// Today's resolved plan — the live source for the Home "Now" card.
export async function GET() {
  try {
    const day = await resolveDay()
    return Response.json({
      dateStr: day.dateStr,
      dayType: day.dayType,
      nowMin: day.nowMin,
      blocks: day.blocks,
      conflicts: day.conflicts,
      sun: day.sun,
      horizon: day.horizon,
    })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}
