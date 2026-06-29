import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Store (or refresh) a device's push subscription.
export async function POST(request: Request) {
  try {
    const sub = await request.json()
    const endpoint: string | undefined = sub?.endpoint
    const p256dh: string | undefined = sub?.keys?.p256dh
    const auth: string | undefined = sub?.keys?.auth
    if (!endpoint || !p256dh || !auth) {
      return Response.json({ error: 'invalid subscription' }, { status: 400 })
    }
    const ua = request.headers.get('user-agent') || null
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({ endpoint, p256dh, auth, ua }, { onConflict: 'endpoint' })
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}
