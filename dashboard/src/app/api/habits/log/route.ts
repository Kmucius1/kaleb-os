import { supabase } from '@/lib/supabase'

// POST /api/habits/log  { habit_id, value, done }
// Upserts today's log for a habit (ET date). Client computes the new value/done.
export async function POST(request: Request) {
  try {
    const { habit_id, value, done } = await request.json().catch(() => ({}))
    if (!habit_id) return Response.json({ error: 'habit_id required' }, { status: 400 })
    const log_date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())
    const { error } = await supabase.from('habit_logs').upsert(
      { habit_id, log_date, value: Number(value) || 0, done: Boolean(done), updated_at: new Date().toISOString() },
      { onConflict: 'habit_id,log_date' },
    )
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}
