import { supabase } from '@/lib/supabase'
import { classifyWorkType, isDelegable, leverageOf } from '@/lib/workType'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

// GET — how the open work splits by leverage.
export async function GET() {
  const { data } = await supabase.from('tasks')
    .select('work_type,delegable,area').in('status', ['pending', 'in_progress'])
  return Response.json({ ok: true, leverage: leverageOf((data ?? []) as { work_type: string | null }[]) })
}

// POST — classify open tasks that have no type yet.
//
// A task Kaleb has corrected by hand (work_type_locked) is never touched, so a
// re-run can't undo a deliberate call. Pass { all: true } to re-run over
// unlocked rows after a rule change.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const redoAll = body?.all === true

  let q = supabase.from('tasks')
    .select('id,title,description,area,work_type')
    .in('status', ['pending', 'in_progress'])
    .eq('work_type_locked', false)
  if (!redoAll) q = q.is('work_type', null)

  const { data: tasks, error } = await q.limit(2000)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  let changed = 0
  let unplaced = 0
  const updates: { id: string; work_type: string; delegable: boolean }[] = []

  for (const t of (tasks ?? []) as { id: string; title: string; description: string | null; area: string | null; work_type: string | null }[]) {
    const type = classifyWorkType(t)
    if (type === null) { unplaced++; continue }
    if (type === t.work_type) continue
    updates.push({ id: t.id, work_type: type, delegable: isDelegable(type) as boolean })
  }

  // Chunked so one oversized request can't fail the whole backfill.
  for (let i = 0; i < updates.length; i += 100) {
    const chunk = updates.slice(i, i + 100)
    await Promise.all(chunk.map(u =>
      supabase.from('tasks').update({ work_type: u.work_type, delegable: u.delegable }).eq('id', u.id),
    ))
    changed += chunk.length
  }

  const { data: after } = await supabase.from('tasks')
    .select('work_type').in('status', ['pending', 'in_progress'])

  return Response.json({
    ok: true,
    considered: tasks?.length ?? 0,
    changed,
    unplaced,
    leverage: leverageOf((after ?? []) as { work_type: string | null }[]),
  })
}
