import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAP: Record<string, string> = {
  approve: 'approved',
  reject: 'rejected',
  hold: 'held',
}

// Kaleb's one-tap decision on a queued winner. Phase 1 just records the decision;
// Phase 2 will fan an 'approved' out to store + creative generation.
export async function POST(request: Request) {
  let body: { id?: string; decision?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 })
  }
  const { id, decision } = body
  if (!id || !decision || !MAP[decision]) {
    return Response.json({ error: 'id and valid decision (approve|reject|hold) required' }, { status: 400 })
  }

  const update: Record<string, unknown> = { status: MAP[decision], decided_at: new Date().toISOString() }
  if (decision === 'approve') update.build_status = 'pending'

  const { error } = await supabase
    .from('commerce_products')
    .update(update)
    .eq('id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true, status: MAP[decision], ...(decision === 'approve' ? { build: 'pending' } : {}) })
}
