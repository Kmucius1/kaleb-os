'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Clock } from 'lucide-react'

// Approve / Reject / Hold a queued product winner. One tap → records the decision.
export default function CommerceDecision({ id }: { id: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  async function decide(decision: 'approve' | 'reject' | 'hold') {
    setBusy(decision)
    try {
      await fetch('/api/commerce/decide', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, decision }),
      })
      setDone(decision)
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  if (done) {
    const label = done === 'approve' ? 'Approved ✓' : done === 'reject' ? 'Rejected' : 'Held'
    const color = done === 'approve' ? 'var(--green)' : done === 'reject' ? 'var(--red)' : 'var(--yellow)'
    return <div style={{ fontSize: 13, fontWeight: 700, color }}>{label}</div>
  }

  const btn = (bg: string, fg: string): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9,
    border: `1px solid ${fg}33`, background: bg, color: fg, fontSize: 13, fontWeight: 700,
    cursor: 'pointer', opacity: busy ? 0.5 : 1,
  })

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <button onClick={() => decide('approve')} disabled={!!busy} style={btn('var(--green-dim)', 'var(--green)')}>
        <Check size={14} /> Approve
      </button>
      <button onClick={() => decide('hold')} disabled={!!busy} style={btn('var(--yellow-dim)', 'var(--yellow)')}>
        <Clock size={14} /> Hold
      </button>
      <button onClick={() => decide('reject')} disabled={!!busy} style={btn('var(--red-dim)', 'var(--red)')}>
        <X size={14} /> Reject
      </button>
    </div>
  )
}
