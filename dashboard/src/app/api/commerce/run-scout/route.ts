import { runScout } from '@/lib/commerce'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

// Manual "Run scout now" trigger from the dashboard.
export async function POST() {
  const res = await runScout({ trigger: 'manual', count: 6 })
  return Response.json(res)
}
