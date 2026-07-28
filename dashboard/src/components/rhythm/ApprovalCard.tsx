'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Zap } from 'lucide-react'

// The buttons the approval queue was missing. Approving is what executes the
// action; until then it has changed nothing.

export default function ApprovalCard({ id, actionType, description, reasoning, when }: {
  id: string
  actionType: string | null
  description: string
  reasoning: string | null
  when: string
}) {
  const router = useRouter()
  const [state, setState] = useState<'open' | 'working' | 'approved' | 'rejected'>('open')
  const [error, setError] = useState('')

  async function decide(decision: 'approve' | 'reject') {
    setState('working'); setError('')
    try {
      const res = await fetch('/api/approvals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, decision }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Could not save that decision')
      }
      setState(decision === 'approve' ? 'approved' : 'rejected')
      router.refresh()
    } catch (e) {
      setError((e as Error).message)
      setState('open')
    }
  }

  const settled = state === 'approved' || state === 'rejected'

  return (
    <div className={`pcard${settled ? '' : ' glow'}`} style={{ opacity: settled ? 0.6 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span className="grad-icon" style={{ width: 38, height: 38, background: 'var(--accent-dim)', borderRadius: 12, flexShrink: 0 }}>
          <Zap size={18} color="var(--accent)" />
        </span>
        <span className="pillar-tag" style={{ color: 'var(--accent)', background: 'var(--accent-dim)' }}>
          {(actionType ?? 'action').replace(/_/g, ' ').toUpperCase()}
        </span>
        <span style={{ color: 'var(--muted)', fontSize: 11, marginLeft: 'auto' }}>{when}</span>
      </div>

      <div style={{ fontSize: 14, marginBottom: 10, lineHeight: 1.5 }}>{description}</div>

      {reasoning && (
        <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', marginBottom: 12, lineHeight: 1.45 }}>
          {reasoning}
        </div>
      )}

      {error && <div style={{ fontSize: 12.5, color: 'var(--red)', marginBottom: 10 }}>{error}</div>}

      {settled ? (
        <div style={{
          fontSize: 12.5, fontWeight: 600, paddingTop: 11, borderTop: '1px solid var(--border)',
          color: state === 'approved' ? 'var(--green)' : 'var(--muted)',
        }}>
          {state === 'approved' ? 'Approved and executed' : 'Dismissed'}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10, paddingTop: 11, borderTop: '1px solid var(--border)' }}>
          <button onClick={() => decide('reject')} disabled={state === 'working'} className="press" style={{
            flex: 1, minHeight: 46, borderRadius: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            color: 'var(--foreground-2)', fontSize: 13.5, fontWeight: 600,
          }}>
            <X size={15} />Reject
          </button>
          <button onClick={() => decide('approve')} disabled={state === 'working'} className="press" style={{
            flex: 1.3, minHeight: 46, borderRadius: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            background: 'var(--accent)', border: 'none', color: '#fff', fontSize: 13.5, fontWeight: 700,
            opacity: state === 'working' ? 0.6 : 1,
          }}>
            <Check size={15} strokeWidth={3} />{state === 'working' ? 'Working…' : 'Approve'}
          </button>
        </div>
      )}
    </div>
  )
}
