import { runScout } from '@/lib/commerce'
import { sendPushToAll } from '@/lib/push'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

// Daily Product Scout: discover trending products → score each through the
// success-rate model → queue winners for Kaleb's approval → push a heads-up.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get('authorization')
    const url = new URL(request.url)
    if (auth !== `Bearer ${secret}` && url.searchParams.get('key') !== secret) {
      return Response.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  const res = await runScout({ trigger: 'cron', count: 8 })

  if (res.winners > 0) {
    await sendPushToAll({
      title: `🛒 ${res.winners} product winner${res.winners === 1 ? '' : 's'} to review`,
      body: res.summary,
      url: '/commerce',
      tag: 'commerce-scout',
    })
  }

  return Response.json(res)
}
