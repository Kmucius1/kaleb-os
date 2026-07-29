'use client'
import { useState } from 'react'
import { Check, Lightbulb, ListTodo, Sparkles, UserRound, X } from 'lucide-react'

// What KalebOS heard, offered back for approval. Nothing on this card exists in
// his tasks or ideas until he taps the check — and every item shows the exact
// words it came from.

export type Proposal = {
  id: string
  kind: 'task' | 'followup' | 'idea' | 'content_idea'
  text: string
  detail: string | null
  quote: string | null
}

const META: Record<Proposal['kind'], { label: string; icon: React.ElementType; color: string }> = {
  task: { label: 'Task', icon: ListTodo, color: 'var(--accent)' },
  followup: { label: 'Follow-up', icon: UserRound, color: 'var(--relationships)' },
  idea: { label: 'Idea', icon: Lightbulb, color: 'var(--mission)' },
  content_idea: { label: 'Content', icon: Sparkles, color: 'var(--money)' },
}

export default function ProposalReview({ summary, proposals, onDone }: {
  summary: string
  proposals: Proposal[]
  onDone?: () => void
}) {
  const [resolved, setResolved] = useState<Record<string, 'approved' | 'rejected' | 'error'>>({})
  const [busy, setBusy] = useState<string | null>(null)

  async function decide(id: string, decision: 'approve' | 'reject') {
    setBusy(id)
    try {
      const res = await fetch('/api/approvals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, decision }),
      })
      setResolved(r => ({ ...r, [id]: res.ok ? (decision === 'approve' ? 'approved' : 'rejected') : 'error' }))
    } catch {
      setResolved(r => ({ ...r, [id]: 'error' }))
    } finally { setBusy(null) }
  }

  const open = proposals.filter(p => !resolved[p.id])

  return (
    <div className="pcard rise rise-2" style={{ marginTop: 12, padding: 16 }}>
      <div className="label" style={{ marginBottom: 8 }}>What I heard</div>
      {summary && (
        <p style={{ fontSize: 13.5, color: 'var(--foreground-2)', margin: '0 0 14px', lineHeight: 1.5 }}>{summary}</p>
      )}

      {proposals.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
          Nothing that needed to become a task. Saved as a reflection.
        </p>
      )}

      {proposals.length > 0 && (
        <>
          <div className="label" style={{ marginBottom: 8 }}>
            {open.length > 0 ? `${open.length} to approve` : 'All reviewed'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {proposals.map(p => {
              const m = META[p.kind]
              const Icon = m.icon
              const state = resolved[p.id]
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 11, padding: '11px 12px',
                  background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 13,
                  opacity: state && state !== 'error' ? 0.55 : 1,
                }}>
                  <Icon size={15} color={m.color} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: m.color, textTransform: 'uppercase' }}>
                      {m.label}{p.detail ? ` · ${p.detail}` : ''}
                    </div>
                    <div style={{ fontSize: 13.5, marginTop: 2, textDecoration: state === 'rejected' ? 'line-through' : 'none' }}>
                      {p.text}
                    </div>
                    {p.quote && (
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4, fontStyle: 'italic' }}>
                        “{p.quote}”
                      </div>
                    )}
                    {state === 'error' && (
                      <div style={{ fontSize: 11.5, color: 'var(--red)', marginTop: 4 }}>Couldn’t save — try again.</div>
                    )}
                  </div>

                  {(!state || state === 'error') && (
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => decide(p.id, 'reject')}
                        disabled={busy === p.id}
                        aria-label={`Dismiss: ${p.text}`}
                        className="press"
                        style={roundBtn('transparent', 'var(--border-2)')}
                      >
                        <X size={15} color="var(--muted)" />
                      </button>
                      <button
                        onClick={() => decide(p.id, 'approve')}
                        disabled={busy === p.id}
                        aria-label={`Approve: ${p.text}`}
                        className="press"
                        style={roundBtn('var(--accent)', 'transparent')}
                      >
                        <Check size={15} color="#fff" strokeWidth={3} />
                      </button>
                    </div>
                  )}
                  {state === 'approved' && <Check size={16} color="var(--green)" style={{ flexShrink: 0, marginTop: 2 }} />}
                </div>
              )
            })}
          </div>
        </>
      )}

      {onDone && (
        <button onClick={onDone} className="press" style={{
          width: '100%', minHeight: 44, marginTop: 14, borderRadius: 13, cursor: 'pointer',
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          color: 'var(--foreground-2)', fontSize: 13.5, fontWeight: 600,
        }}>
          Done
        </button>
      )}
    </div>
  )
}

const roundBtn = (bg: string, border: string): React.CSSProperties => ({
  width: 44, height: 44, borderRadius: '50%', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: bg, border: border === 'transparent' ? 'none' : `1.5px solid ${border}`,
})
