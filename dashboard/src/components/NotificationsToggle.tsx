'use client'
import { useEffect, useState } from 'react'
import { Bell, BellOff, Check, Loader2, Send, Smartphone } from 'lucide-react'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

type State = 'loading' | 'unsupported' | 'needs-install' | 'default' | 'denied' | 'subscribed'

export default function NotificationsToggle() {
  const [state, setState] = useState<State>('loading')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    // iOS only allows web push from the installed (Home Screen) app.
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    if (!supported) { setState(isIOS && !standalone ? 'needs-install' : 'unsupported'); return }
    if (isIOS && !standalone) { setState('needs-install'); return }

    ;(async () => {
      if (Notification.permission === 'denied') { setState('denied'); return }
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        setState(sub ? 'subscribed' : (Notification.permission === 'granted' ? 'default' : 'default'))
      } catch { setState('default') }
    })()
  }, [])

  async function enable() {
    setBusy(true); setMsg('')
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setState(perm === 'denied' ? 'denied' : 'default'); setBusy(false); return }
      const reg = await navigator.serviceWorker.ready
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!key) throw new Error('Missing VAPID public key')
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      })
      const res = await fetch('/api/push/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub),
      })
      if (!res.ok) throw new Error('Failed to save subscription')
      setState('subscribed'); setMsg('This device is set up. Send a test below.')
    } catch (e) {
      setMsg('Error: ' + (e as Error).message)
    } finally { setBusy(false) }
  }

  async function test() {
    setBusy(true); setMsg('')
    try {
      const res = await fetch('/api/push/test', { method: 'POST' })
      const data = await res.json()
      setMsg(res.ok ? `Sent to ${data.sent} device${data.sent === 1 ? '' : 's'}. Check your lock screen.` : 'Error: ' + (data.error || 'failed'))
    } catch (e) { setMsg('Error: ' + (e as Error).message) } finally { setBusy(false) }
  }

  const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        {state === 'subscribed' ? <Bell size={18} color="var(--green)" /> : <BellOff size={18} color="var(--muted)" />}
        <span style={{ fontWeight: 700, fontSize: 15 }}>Phone notifications</span>
      </div>

      {state === 'loading' && <p style={muted}><Loader2 size={13} className="spin" style={{ verticalAlign: 'middle' }} /> Checking…</p>}

      {state === 'needs-install' && (
        <p style={muted}>
          <Smartphone size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          On iPhone, add Kaleb OS to your Home Screen first (Share → Add to Home Screen), then open it from there and come back to enable notifications.
        </p>
      )}
      {state === 'unsupported' && <p style={muted}>This browser doesn’t support push notifications. Use the installed app on your phone.</p>}
      {state === 'denied' && <p style={muted}>Notifications are blocked. Enable them for Kaleb OS in your device settings, then reload.</p>}

      {(state === 'default') && (
        <>
          <p style={muted}>Get your 8am brief, meditation nudges, feeling check-ins, approvals, and new leads on your phone.</p>
          <button onClick={enable} disabled={busy} style={primaryBtn}>
            {busy ? <Loader2 size={15} className="spin" /> : <Bell size={15} />} Enable notifications
          </button>
        </>
      )}

      {state === 'subscribed' && (
        <>
          <p style={{ ...muted, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 6 }}><Check size={14} /> This device is receiving notifications.</p>
          <button onClick={test} disabled={busy} style={secondaryBtn}>
            {busy ? <Loader2 size={15} className="spin" /> : <Send size={15} />} Send a test
          </button>
        </>
      )}

      {msg && <p style={{ ...muted, marginTop: 10 }}>{msg}</p>}
    </div>
  )
}

const muted: React.CSSProperties = { color: 'var(--foreground-2)', fontSize: 13, lineHeight: 1.5, margin: '4px 0 12px' }
const primaryBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }
const secondaryBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--surface-2)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }
