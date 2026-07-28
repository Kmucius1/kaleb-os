import { applyRebalance, proposeRebalance, todayET } from '@/lib/rhythm/day'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const Body = z.object({
  /** false (default) = preview only. Nothing is ever written without this. */
  apply: z.boolean().optional(),
  disruption: z.object({ key: z.string(), newEnd: z.number().int().min(0).max(1440) }).optional(),
})

// GET  → a proposal to review. POST with apply:true → persist the approved plan.
export async function GET() {
  const { proposal } = await proposeRebalance()
  return Response.json(proposal)
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return Response.json({ error: 'bad request' }, { status: 400 })

  const { proposal } = await proposeRebalance(parsed.data.disruption)
  if (!parsed.data.apply) return Response.json({ applied: false, ...proposal })

  await applyRebalance(todayET(), proposal.blocks)
  return Response.json({ applied: true, ...proposal })
}
