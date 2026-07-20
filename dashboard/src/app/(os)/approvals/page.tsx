import { supabase } from '@/lib/supabase'
import { formatTime } from '@/lib/utils'
import { Inbox, Mail, Send, Bell, Zap } from 'lucide-react'

export const revalidate = 30

type AgentAction = {
  id: string
  action_type: string | null
  description: string
  payload: Record<string, unknown> | null
  status: string
  created_at: string
  executed_at: string | null
}

function statusColor(status: string) {
  const map: Record<string, string> = {
    pending_approval: 'var(--accent)',
    approved: 'var(--green)',
    rejected: 'var(--red)',
    executed: 'var(--blue)',
  }
  return map[status] ?? 'var(--muted)'
}

function actionIcon(type: string | null) {
  const t = (type ?? '').toLowerCase()
  if (t.includes('email') || t.includes('mail')) return Mail
  if (t.includes('send') || t.includes('post')) return Send
  if (t.includes('notif') || t.includes('remind')) return Bell
  return Zap
}

export default async function ApprovalsPage() {
  const { data, error } = await supabase
    .from('agent_actions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  const all: AgentAction[] = data ?? []
  const pending = all.filter(a => a.status === 'pending_approval')
  const history = all.filter(a => a.status !== 'pending_approval')

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '18px 16px 40px' }}>
      {/* Header */}
      <div className="rise rise-1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 className="h-hero" style={{ margin: 0, fontSize: 26 }}>Approval Queue</h1>
          <p style={{ color: 'var(--foreground-2)', fontSize: 13, margin: '6px 0 0' }}>{pending.length} pending · approve or reject below</p>
        </div>
        <span className="grad-icon" style={{ width: 40, height: 40, background: 'var(--accent-dim)', borderRadius: 13 }}><Inbox size={19} color="var(--accent)" /></span>
      </div>

      {error && (
        <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 16 }}>Error: {error.message}</div>
      )}

      {/* Pending section */}
      <div style={{ marginBottom: 32 }}>
        <div className="label rise rise-2" style={{ color: pending.length > 0 ? 'var(--accent)' : 'var(--muted)', margin: '0 4px 12px' }}>
          Pending ({pending.length})
        </div>

        {pending.length === 0 ? (
          <div className="pcard rise rise-2" style={{ color: 'var(--muted)', fontSize: 13, padding: '34px 0', textAlign: 'center' }}>
            No pending approvals
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pending.map((a, i) => {
              const Icon = actionIcon(a.action_type)
              return (
                <div key={a.id} className={`pcard glow rise rise-${Math.min(6, i + 2)}`}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <span className="grad-icon" style={{ width: 38, height: 38, background: 'var(--accent-dim)', borderRadius: 12, flexShrink: 0 }}><Icon size={18} color="var(--accent)" /></span>
                    <span className="pillar-tag" style={{ color: 'var(--accent)', background: 'var(--accent-dim)' }}>
                      {a.action_type?.toUpperCase() ?? 'ACTION'}
                    </span>
                    <span style={{ color: 'var(--muted)', fontSize: 11, marginLeft: 'auto' }}>{formatTime(a.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--foreground)', marginBottom: 12, lineHeight: 1.5 }}>
                    {a.description}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', borderTop: '1px solid var(--border)', paddingTop: 11 }}>
                    Approve or reject below
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="rise rise-5">
          <div className="label" style={{ margin: '0 4px 12px' }}>History ({history.length})</div>
          <div className="pcard" style={{ padding: '4px 10px' }}>
            {history.map((a, i) => {
              const color = statusColor(a.status)
              return (
                <div key={a.id} style={{ display: 'flex', gap: 13, padding: '13px 6px', borderTop: i ? '1px solid var(--border)' : 'none', alignItems: 'flex-start' }}>
                  <span className="pillar-tag" style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)`, flexShrink: 0, minWidth: 78, textAlign: 'center' }}>
                    {a.status.replace(/_/g, ' ').toUpperCase()}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.description}
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>
                      {a.action_type ?? '—'}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'right', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {formatTime(a.created_at)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
