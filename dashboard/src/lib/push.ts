import webpush from 'web-push'
import { supabase } from './supabase'

let configured = false
function configure() {
  if (configured) return
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:kaleb@kalebos.app'
  if (!pub || !priv) throw new Error('VAPID keys not configured')
  webpush.setVapidDetails(subject, pub, priv)
  configured = true
}

export type PushPayload = { title: string; body?: string; url?: string; tag?: string }

// Send a push to every registered device. Prunes dead subscriptions (410/404).
export async function sendPushToAll(payload: PushPayload): Promise<{ sent: number; failed: number }> {
  configure()
  const { data: subs } = await supabase.from('push_subscriptions').select('id,endpoint,p256dh,auth')
  if (!subs || subs.length === 0) return { sent: 0, failed: 0 }

  const json = JSON.stringify(payload)
  let sent = 0, failed = 0
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        json,
      )
      sent++
    } catch (e: unknown) {
      failed++
      const code = (e as { statusCode?: number }).statusCode
      if (code === 410 || code === 404) {
        await supabase.from('push_subscriptions').delete().eq('id', s.id)
      }
    }
  }))
  return { sent, failed }
}

// Record a notification so it only fires once per (kind, ref, day). Returns
// false if it was already logged today (i.e. don't send again).
export async function claimOnce(kind: string, ref: string, title: string, body?: string): Promise<boolean> {
  const { error } = await supabase.from('notification_log').insert({ kind, ref, title, body })
  if (error) return false // unique violation = already sent today
  return true
}
