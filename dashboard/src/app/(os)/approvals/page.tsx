import { supabase } from '@/lib/supabase'
import { formatTime } from '@/lib/utils'

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
    <div className="page-pad" style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
        <h1 style={{ color: 'var(--foreground)', fontWeight: 800, fontSize: 25, letterSpacing: '-0.02em', margin: 0 }}>Approval Queue</h1>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>
          {pending.length} pending · approve or reject below
        </span>
      </div>

      {error && (
        <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 16 }}>Error: {error.message}</div>
      )}

      {/* Pending section */}
      <div style={{ marginBottom: 32 }}>
        <div className="section-label" style={{ color: pending.length > 0 ? 'var(--accent)' : 'var(--muted)', marginBottom: 12 }}>
          Pending ({pending.length})
        </div>

        {pending.length === 0 ? (
          <div className="card2" style={{ color: 'var(--muted)', fontSize: 13, padding: '28px 0', textAlign: 'center' }}>
            No pending approvals
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.map(a => (
              <div key={a.id} className="card2" style={{ borderLeft: '3px solid var(--accent)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, gap: 10 }}>
                  <span className="pillar-tag" style={{ color: 'var(--accent)', background: 'var(--accent-dim)' }}>
                    {a.action_type?.toUpperCase() ?? 'ACTION'}
                  </span>
                  <span style={{ color: 'var(--muted)', fontSize: 11 }}>{formatTime(a.created_at)}</span>
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--foreground)', marginBottom: 10, lineHeight: 1.5 }}>
                  {a.description}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  Approve or reject below
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div>
          <div className="section-label" style={{ marginBottom: 12 }}>History ({history.length})</div>
          <div className="card2" style={{ padding: 0, overflow: 'hidden' }}>
            {history.map((a, i) => (
              <div key={a.id} className="list-row" style={{ gap: 14, borderTop: i ? '1px solid var(--border)' : 'none', alignItems: 'flex-start' }}>
                <span className="pillar-tag" style={{ color: statusColor(a.status), background: `color-mix(in srgb, ${statusColor(a.status)} 14%, transparent)`, flexShrink: 0, minWidth: 78, textAlign: 'center' }}>
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
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
