'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowRight, Sparkles, X } from 'lucide-react'
import { fmtMin } from '@/lib/rhythm/engine'
import type { RebalanceProposal } from '@/lib/rhythm/types'

// "Rebalance My Day" is always a proposal first. Nothing is written until Kaleb
// approves it, and approving is one tap — as is undoing it.

export default function RebalanceSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [proposal, setProposal] = useState<RebalanceProposal | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'applying' | 'applied' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setState('loading')
    fetch('/api/rhythm/rebalance', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('Could not build a proposal'))))
      .then(p => { setProposal(p); setState('ready') })
      .catch(e => { setError(e.message); setState('error') })
  }, [open])

  if (!open) return null

  const changed = (proposal?.changes ?? []).filter(c => c.kind !== 'kept')

  async function apply() {
    setState('applying')
    try {
      const res = await fetch('/api/rhythm/rebalance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apply: true }),
      })
      if (!res.ok) throw new Error('Could not apply')
      setState('applied')
      router.refresh()
      setTimeout(onClose, 900)
    } catch (e) {
      setError((e as Error).message); setState('error')
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Rebalance my day"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end',
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 520, margin: '0 auto', maxHeight: '85dvh', overflowY: 'auto',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '22px 22px 0 0', padding: '18px 18px calc(18px + env(safe-area-inset-bottom))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <Sparkles size={17} color="var(--accent)" />
          <span className="h-title" style={{ flex: 1, fontSize: 18 }}>Rebalance my day</span>
          <button onClick={onClose} aria-label="Close" className="press" style={{
            width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--surface-2)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={16} color="var(--foreground-2)" />
          </button>
        </div>

        {state === 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="skel" style={{ height: 54 }} />
            <div className="skel" style={{ height: 54 }} />
            <div className="skel" style={{ height: 54 }} />
          </div>
        )}

        {state === 'error' && (
          <div style={{ padding: '20px 0' }}>
            <p style={{ fontSize: 14, color: 'var(--red)', margin: 0 }}>{error || 'Something went wrong.'}</p>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '8px 0 0' }}>Your day is unchanged.</p>
          </div>
        )}

        {proposal && state !== 'loading' && state !== 'error' && (
          <>
            <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--foreground)', margin: '0 0 16px' }}>
              {proposal.summary}
            </p>

            {proposal.warnings.map((w, i) => (
              <div key={i} style={{
                display: 'flex', gap: 9, alignItems: 'flex-start', padding: '10px 12px', marginBottom: 10,
                background: 'var(--yellow-dim)', border: '1px solid color-mix(in srgb, var(--yellow) 30%, transparent)',
                borderRadius: 12,
              }}>
                <AlertTriangle size={14} color="var(--yellow)" style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 12.5, color: 'var(--foreground-2)', lineHeight: 1.4 }}>{w}</span>
              </div>
            ))}

            {changed.length === 0 ? (
              <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: '0 0 16px' }}>
                Nothing needs to move — you’re on track.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                {changed.map(c => (
                  <div key={c.key} className="list-card" style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>{c.title}</span>
                      <span className="pillar-tag" style={{
                        color: c.kind === 'skipped' ? 'var(--red)' : c.kind === 'shortened' ? 'var(--yellow)' : 'var(--accent)',
                        background: c.kind === 'skipped' ? 'var(--red-dim)' : c.kind === 'shortened' ? 'var(--yellow-dim)' : 'var(--accent-dim)',
                      }}>{c.kind}</span>
                    </div>
                    {c.from && c.to && (
                      <div className="tabular" style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ textDecoration: 'line-through' }}>{fmtMin(c.from.start)}–{fmtMin(c.from.end)}</span>
                        <ArrowRight size={11} />
                        <span style={{ color: 'var(--foreground)' }}>{fmtMin(c.to.start)}–{fmtMin(c.to.end)}</span>
                      </div>
                    )}
                    <p style={{ fontSize: 12, color: 'var(--foreground-2)', margin: '6px 0 0', lineHeight: 1.4 }}>{c.why}</p>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} className="press" style={{
                flex: 1, minHeight: 48, borderRadius: 14, cursor: 'pointer', fontSize: 14, fontWeight: 600,
                background: 'var(--surface-2)', color: 'var(--foreground-2)', border: '1px solid var(--border)',
              }}>
                Keep as is
              </button>
              <button
                onClick={apply}
                disabled={state === 'applying' || state === 'applied' || changed.length === 0}
                className="press"
                style={{
                  flex: 1.4, minHeight: 48, borderRadius: 14, cursor: 'pointer', fontSize: 14, fontWeight: 700,
                  background: 'var(--accent)', color: '#fff', border: 'none',
                  opacity: state === 'applying' || changed.length === 0 ? 0.55 : 1,
                }}
              >
                {state === 'applied' ? 'Applied' : state === 'applying' ? 'Applying…' : 'Approve'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
