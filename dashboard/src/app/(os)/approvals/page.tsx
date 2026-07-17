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
    executed: '#3b82f6',
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
    <div style={{ padding: '20px 28px', maxWidth: 1200 }}>
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 16,
        marginBottom: 24,
        paddingBottom: 16,
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em' }}>
          APPROVAL QUEUE
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 10 }}>
          {pending.length} pending · approve or reject below · revalidates 30s
        </div>
      </div>

      {error && (
        <div style={{ color: 'var(--red)', fontSize: 11, marginBottom: 16 }}>Error: {error.message}</div>
      )}

      {/* Pending section */}
      <div style={{ marginBottom: 36 }}>
        <div style={{
          color: pending.length > 0 ? 'var(--accent)' : 'var(--muted)',
          fontWeight: 700,
          fontSize: 10,
          letterSpacing: '0.1em',
          marginBottom: 12,
        }}>
          PENDING ({pending.length})
        </div>

        {pending.length === 0 ? (
          <div style={{
            color: 'var(--muted)',
            fontSize: 11,
            padding: '28px 0',
            textAlign: 'center',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
          }}>
            — no pending approvals —
          </div>
        ) : (
          pending.map(a => (
            <div key={a.id} style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderLeft: '3px solid var(--accent)',
              padding: '14px 18px',
              marginBottom: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <span style={{ color: 'var(--accent)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}>
                  {a.action_type?.toUpperCase() ?? 'ACTION'}
                </span>
                <span style={{ color: 'var(--muted)', fontSize: 10 }}>{formatTime(a.created_at)}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--foreground)', marginBottom: 10, lineHeight: 1.5 }}>
                {a.description}
              </div>
              <div style={{
                fontSize: 10,
                color: '#333',
                fontStyle: 'italic',
                borderTop: '1px solid var(--border)',
                paddingTop: 8,
              }}>
                Approve or reject below
              </div>
            </div>
          ))
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div>
          <div style={{ color: 'var(--muted)', fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', marginBottom: 12 }}>
            HISTORY ({history.length})
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.09em', textAlign: 'left' }}>
                <th style={{ paddingBottom: 8, fontWeight: 400, width: 120 }}>STATUS</th>
                <th style={{ paddingBottom: 8, fontWeight: 400, width: 100 }}>TYPE</th>
                <th style={{ paddingBottom: 8, fontWeight: 400 }}>DESCRIPTION</th>
                <th style={{ paddingBottom: 8, fontWeight: 400, width: 120, textAlign: 'right' }}>TIME</th>
              </tr>
            </thead>
            <tbody>
              {history.map((a, i) => (
                <tr key={a.id} style={{ borderBottom: '1px solid #161616' }}>
                  <td style={{ padding: '8px 16px 8px 0' }}>
                    <span style={{ color: statusColor(a.status), fontSize: 9, fontWeight: 700, letterSpacing: '0.06em' }}>
                      {a.status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '8px 16px 8px 0', fontSize: 10, color: 'var(--muted)' }}>
                    {a.action_type ?? '—'}
                  </td>
                  <td style={{ padding: '8px 16px 8px 0', maxWidth: 400 }}>
                    <div style={{ fontSize: 11, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.description}
                    </div>
                  </td>
                  <td style={{ padding: '8px 0', fontSize: 10, color: 'var(--muted)', textAlign: 'right' }}>
                    {formatTime(a.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
