import { supabase } from '@/lib/supabase'

// POST /api/tasks/update  { id, status?, priority?, owner? }
//
// The tasks page was read-only, so nothing ever left the list — which is most of
// why it reached 306 rows. One endpoint covers the three gestures that matter:
// finish it, it isn't mine / doesn't matter (dismiss), and put it back.
const STATUSES = new Set(['pending', 'in_progress', 'completed', 'dismissed'])

export async function POST(request: Request) {
  try {
    const { id, status, priority, owner } = await request.json().catch(() => ({}))
    if (!id) return Response.json({ error: 'id required' }, { status: 400 })

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (status !== undefined) {
      if (!STATUSES.has(status)) return Response.json({ error: 'bad status' }, { status: 400 })
      patch.status = status
      patch.dismissed_at = status === 'dismissed' ? new Date().toISOString() : null
    }
    if (priority !== undefined) {
      patch.priority = Math.min(10, Math.max(1, Math.round(Number(priority) || 5)))
      patch.triaged_at = new Date().toISOString()
    }
    if (owner !== undefined) {
      if (!['kaleb', 'team', 'other'].includes(owner)) return Response.json({ error: 'bad owner' }, { status: 400 })
      patch.owner = owner
      patch.triaged_at = new Date().toISOString()
    }

    const { error } = await supabase.from('tasks').update(patch).eq('id', id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}
