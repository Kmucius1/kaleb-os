'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, Hammer, Loader2, Rocket } from 'lucide-react'

const TERMINAL = new Set(['ready', 'live', 'failed'])

// Interactive controls on the product detail page's LAUNCH PIPELINE card:
// run/rebuild the build, poll status while it's in flight, and — once the
// landing page is up but no checkout is wired — the Phase-2a manual bridge.
export default function CommerceBuild({
  id, buildStatus, checkoutUrl, landingPageUrl,
}: {
  id: string; buildStatus: string | null; checkoutUrl: string | null; landingPageUrl: string | null
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [manualValue, setManualValue] = useState('')
  const [manualBusy, setManualBusy] = useState(false)
  const [manualError, setManualError] = useState<string | null>(null)
  const stopped = useRef(false)

  // Poll build-status while a build is in flight.
  useEffect(() => {
    stopped.current = false
    if (buildStatus !== 'pending' && buildStatus !== 'building') return
    const interval = setInterval(async () => {
      if (stopped.current) return
      try {
        const res = await fetch(`/api/commerce/build-status?id=${id}`)
        const data = await res.json()
        if (!data.ok) return
        if (TERMINAL.has(data.build_status) || data.build_status !== buildStatus) {
          stopped.current = true
          clearInterval(interval)
          router.refresh()
        }
      } catch {
        // transient — try again next tick
      }
    }, 3000)
    return () => {
      stopped.current = true
      clearInterval(interval)
    }
  }, [id, buildStatus, router])

  async function runBuild(force: boolean) {
    setBusy(true)
    try {
      await fetch('/api/commerce/build', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...(force ? { force: true } : {}) }),
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function goLive() {
    if (!manualValue.trim() || manualBusy) return
    setManualBusy(true); setManualError(null)
    try {
      const value = manualValue.trim()
      const body = value.startsWith('http') ? { id, checkoutUrl: value } : { id, variantId: value }
      const res = await fetch('/api/commerce/listing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setManualError(data.error || 'Failed'); return }
      setManualValue('')
      router.refresh()
    } finally {
      setManualBusy(false)
    }
  }

  const isRerunnable = buildStatus === 'ready' || buildStatus === 'live' || buildStatus === 'failed'
  const isInFlight = buildStatus === 'pending' || buildStatus === 'building'
  const showManualBridge = buildStatus === 'ready' && !checkoutUrl

  const input: React.CSSProperties = {
    background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 9,
    padding: '10px 12px', fontSize: 13.5, color: 'var(--foreground)', width: '100%',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => runBuild(isRerunnable)} disabled={busy || isInFlight} style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '9px 15px', borderRadius: 9,
          border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--foreground)',
          fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: busy || isInFlight ? 0.6 : 1,
        }}>
          {busy || isInFlight ? <Loader2 size={15} className="spin" /> : <Hammer size={15} color="var(--accent)" />}
          {busy ? 'Starting…' : isInFlight ? 'Building…' : isRerunnable ? 'Rebuild' : 'Run build'}
        </button>
      </div>

      {showManualBridge && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
            <Rocket size={14} color="var(--cyan)" /> Go live
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, lineHeight: 1.5 }}>
            Landing page is up{landingPageUrl && (
              <> — <a href={landingPageUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cyan)', display: 'inline-flex', gap: 3, alignItems: 'center' }}>view it <ExternalLink size={11} /></a></>
            )}. Once the AutoDS/Shopify import is done, paste the variant ID or the full cart/checkout URL here to wire the Buy button.
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 240px' }}>
              <input value={manualValue} onChange={e => setManualValue(e.target.value)}
                placeholder="Shopify variant ID or full cart/checkout URL"
                onKeyDown={e => e.key === 'Enter' && goLive()} style={input} />
            </div>
            <button onClick={goLive} disabled={manualBusy || !manualValue.trim()} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 9,
              border: 'none', background: 'var(--cyan)', color: '#04222b', fontSize: 13.5, fontWeight: 700,
              cursor: 'pointer', opacity: manualBusy || !manualValue.trim() ? 0.5 : 1,
            }}>
              {manualBusy ? <Loader2 size={15} className="spin" /> : <Rocket size={15} />} {manualBusy ? 'Going live…' : 'Go live'}
            </button>
          </div>
          {manualError && <div style={{ marginTop: 8, fontSize: 12.5, fontWeight: 600, color: 'var(--red)' }}>{manualError}</div>}
        </div>
      )}
    </div>
  )
}
