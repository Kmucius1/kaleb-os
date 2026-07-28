import { synthesize } from '@/lib/rhythm/synthesis'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: Request) {
  const url = new URL(req.url)
  const days = Math.min(120, Math.max(7, Number(url.searchParams.get('days') ?? 30) || 30))
  try {
    return Response.json(await synthesize(days))
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}
