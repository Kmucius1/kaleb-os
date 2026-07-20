import { generateEveningReview } from '@/lib/briefing'
import { sendPushToAll, claimOnce } from '@/lib/push'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Vercel cron ~9pm ET. Generates the evening review + pushes the daily score.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  const log: Record<string, unknown> = {}
  let review: { headline?: string | null; score?: number | null } | null = null
  try { review = await generateEveningReview() } catch (e) { log.error = (e as Error).message }
  try {
    if (await claimOnce('review', 'evening', 'Evening review')) {
      const r = await sendPushToAll({
        title: `🌙 Evening review${review?.score != null ? ` · ${review.score}/10` : ''}`,
        body: review?.headline || 'Your day is reviewed — see how it went.',
        url: '/daily-brief', tag: 'review',
      })
      log.push = r
    }
  } catch (e) { log.push_error = (e as Error).message }
  return Response.json({ ok: true, ...log })
}
