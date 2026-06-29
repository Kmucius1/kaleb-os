import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Today's check-ins (ET day).
export async function GET() {
  const startEt = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
  startEt.setHours(0, 0, 0, 0)
  const { data, error } = await supabase
    .from('mood_checkins').select('id,mood,score,energy,note,context,created_at')
    .gte('created_at', startEt.toISOString())
    .order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ checkins: data ?? [] })
}

export async function POST(request: Request) {
  try {
    const b = await request.json()
    const { error } = await supabase.from('mood_checkins').insert({
      mood: b.mood ?? null,
      score: typeof b.score === 'number' ? b.score : null,
      energy: typeof b.energy === 'number' ? b.energy : null,
      note: b.note?.trim() || null,
      context: b.context?.trim() || null,
      source: b.source || 'checkin',
    })
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}
