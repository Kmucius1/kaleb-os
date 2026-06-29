import { sendPushToAll } from '@/lib/push'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Fire a test notification to all of Kaleb's devices. Behind the session gate.
export async function POST() {
  try {
    const res = await sendPushToAll({
      title: '✅ Kaleb OS notifications are on',
      body: 'This is a test. You’ll get your morning brief, reminders, and check-ins here.',
      url: '/',
      tag: 'test',
    })
    return Response.json({ ok: true, ...res })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}
