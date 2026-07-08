'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Radar, Loader2 } from 'lucide-react'

// Manually trigger a scout run (the daily cron does this automatically).
export default function RunScoutButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function run() {
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/commerce/run-scout', { method: 'POST' })
      const data = await res.json()
      setMsg(data.summary || (data.ok ? 'Done' : 'Failed'))
      router.refresh()
    } catch {
      setMsg('Failed to run scout')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <button onClick={run} disabled={busy} style={{
        display: 'flex', alignItems: 'center', gap: 7, padding: '9px 15px', borderRadius: 9,
        border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--foreground)',
        fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1,
      }}>
        {busy ? <Loader2 size={15} className="spin" /> : <Radar size={15} color="var(--accent)" />}
        {busy ? 'Scouting…' : 'Run scout now'}
      </button>
      {msg && <span style={{ fontSize: 12.5, color: 'var(--foreground-2)' }}>{msg}</span>}
    </div>
  )
}
