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
      approved: '#22c55e',
      rejected: 'var(--red)',
      executed: '#3b82f6',
    }
    return map[s] ?? 'var(--muted)'
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1200 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={16} color="var(--accent)" />
          <span style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: 16, letterSpacing: '0.06em' }}>AGENT ACTIONS</span>
        </div>
        <span style={{ color: 'var(--muted)', fontSize: 11 }}>{all.length} total · {pending.length} pending · {executed.length} executed</span>
      </div>

      {all.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '48px', textAlign: 'center', color: 'var(--muted)', fontSize: 11 }}>
          — no agent actions yet — Hermes logs all actions here
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.09em', textAlign: 'left' }}>
              <th style={{ paddingBottom: 8, fontWeight: 400, width: 120 }}>STATUS</th>
              <th style={{ paddingBottom: 8, fontWeight: 400, width: 130 }}>TYPE</th>
              <th style={{ paddingBottom: 8, fontWeight: 400 }}>DESCRIPTION</th>
              <th style={{ paddingBottom: 8, fontWeight: 400, width: 130, textAlign: 'right' }}>TIME</th>
            </tr>
          </thead>
          <tbody>
            {all.map((a, i) => (
              <tr key={a.id} style={{ borderBottom: '1px solid #161616', background: i % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                <td style={{ padding: '10px 16px 10px 0' }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: statusColor(a.status), letterSpacing: '0.06em' }}>
                    {a.status.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '10px 16px 10px 0', fontSize: 10, color: 'var(--muted)' }}>{a.action_type ?? '—'}</td>
                <td style={{ padding: '10px 16px 10px 0', maxWidth: 500 }}>
                  <div style={{ fontSize: 11, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.description}
                  </div>
                </td>
                <td style={{ padding: '10px 0', fontSize: 10, color: 'var(--muted)', textAlign: 'right' }}>
                  {formatTime(a.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
