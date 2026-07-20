import { generateMorningBrief, generateEveningReview } from '@/lib/briefing'

// POST /api/brief/generate  { type?: 'morning' | 'evening' }
// On-demand generation from the Daily Briefing screen (behind the login gate).
export async function POST(request: Request) {
  try {
    const { type } = await request.json().catch(() => ({}))
    const row = type === 'evening' ? await generateEveningReview() : await generateMorningBrief()
    return Response.json({ ok: true, row })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}
