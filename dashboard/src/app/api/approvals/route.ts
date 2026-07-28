import { supabase } from '@/lib/supabase'
import { addTask, logIdea, logContentIdea } from '@/lib/kalebos-actions'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Approve or reject a queued action. Approval is the *only* thing that executes
// it — until then the proposal has changed nothing in Kaleb's world.

const Body = z.object({
  id: z.string().uuid(),
  decision: z.enum(['approve', 'reject']),
  feedback: z.string().max(1000).optional(),
})

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'bad request' }, { status: 400 })
  const { id, decision, feedback } = parsed.data

  const { data: action, error } = await supabase
    .from('agent_actions')
    .select('id,action_type,payload,status')
    .eq('id', id)
    .maybeSingle()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!action) return Response.json({ error: 'not found' }, { status: 404 })
  if (action.status !== 'pending_approval') {
    return Response.json({ error: `already ${action.status}` }, { status: 409 })
  }

  if (decision === 'reject') {
    await supabase
      .from('agent_actions')
      .update({ status: 'rejected', resolved_at: new Date().toISOString(), kaleb_feedback: feedback ?? null })
      .eq('id', id)
    return Response.json({ ok: true, status: 'rejected' })
  }

  let outcome: unknown = null
  try {
    outcome = await execute(String(action.action_type ?? ''), (action.payload ?? {}) as Record<string, unknown>)
  } catch (e) {
    // A failed execution must not look like an approval that worked.
    await supabase
      .from('agent_actions')
      .update({ status: 'pending_approval', outcome: { error: (e as Error).message } })
      .eq('id', id)
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }

  await supabase
    .from('agent_actions')
    .update({
      status: 'approved',
      resolved_at: new Date().toISOString(),
      outcome: outcome as never,
      kaleb_feedback: feedback ?? null,
    })
    .eq('id', id)

  return Response.json({ ok: true, status: 'approved', outcome })
}

async function execute(actionType: string, payload: Record<string, unknown>): Promise<unknown> {
  const text = String(payload.text ?? '')
  const detail = payload.detail == null ? null : String(payload.detail)

  switch (actionType) {
    case 'journal_task':
      return addTask({ title: text, deadline: detail ?? undefined })
    case 'journal_followup':
      return addTask({ title: detail ? `Follow up with ${detail}: ${text}` : `Follow up: ${text}` })
    case 'journal_idea':
      return logIdea({ idea: text, category: detail ?? 'personal' })
    case 'journal_content_idea':
      return logContentIdea({ brand: 'me', hook: text })
    default:
      // Unknown types are still resolvable — we record the decision without
      // pretending to have executed something we don't understand.
      return { noted: true, action_type: actionType }
  }
}
