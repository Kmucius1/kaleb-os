import { runBuild, type BuildStep } from '@/lib/commerce-build'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

// Kicks off (or resumes) the approve → live build pipeline for a product.
// Triggered independently from the approve decision so a Vercel lambda freeze
// on the decide request never kills the build (see CommerceDecision.tsx).
export async function POST(request: Request) {
  let body: { id?: string; force?: boolean; steps?: BuildStep[] }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 })
  }
  const { id, force, steps } = body
  if (!id) {
    return Response.json({ error: 'id required' }, { status: 400 })
  }

  const result = await runBuild(id, { force, steps, trigger: 'manual' })
  return Response.json(result)
}
