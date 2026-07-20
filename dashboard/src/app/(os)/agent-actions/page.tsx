import { supabase } from '@/lib/supabase'
import { Zap } from 'lucide-react'
import { formatTime } from '@/lib/utils'

export const revalidate = 30

export default async function AgentActionsPage() {
  const { data } = await supabase
    .from('agent_actions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  const all = data ?? []
  const pending = all.filter(a => a.status === 'pending_approval')
  const executed = all.filter(a => a.status === 'executed')

  function statusColor(s: string) {
    const map: Record<string, string> = {
      pending_approval: 'var(--accent)',
      approved: 'var(--green)',
      rejected: 'var(--red)',
      executed: 'var(--blue)',
    }
    return map[s] ?? 'var(--muted)'
  }

  return (
    <div className="page-pad" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Zap size={20} color="var(--accent)" />
          <h1 style={{ color: 'var(--foreground)', fontWeight: 800, fontSize: 25, letterSpacing: '-0.02em', margin: 0 }}>Agent Actions</h1>
        </div>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{all.length} total · {pending.length} pending · {executed.length} executed</span>
      </div>

      {all.length === 0 ? (
        <div className="card2" style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          No agent actions yet — Atlas logs all actions here
        </div>
      ) : (
        <div className="card2" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: 'var(--muted)', fontSize: 9.5, letterSpacing: '0.09em', textAlign: 'left' }}>
                <th style={{ padding: '12px 14px', fontWeight: 700, width: 130 }}>STATUS</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, width: 130 }}>TYPE</th>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>DESCRIPTION</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, width: 130, textAlign: 'right' }}>TIME</th>
              </tr>
            </thead>
            <tbody>
              {all.map((a, i) => (
                <tr key={a.id} className="row-hover" style={{ borderTop: i ? '1px solid var(--border)' : 'none' }}>
                  <td style={{ padding: '11px 14px' }}>
                    <span className="pillar-tag" style={{ color: statusColor(a.status), background: `color-mix(in srgb, ${statusColor(a.status)} 14%, transparent)` }}>
                      {a.status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: 11.5, color: 'var(--foreground-2)' }}>{a.action_type ?? '—'}</td>
                  <td style={{ padding: '11px 14px', maxWidth: 500 }}>
                    <div style={{ fontSize: 12.5, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.description}
                    </div>
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)', textAlign: 'right', whiteSpace: 'nowrap' }}>
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
