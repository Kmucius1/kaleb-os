import { supabase } from '@/lib/supabase'
import { Zap, Mail, Calendar, FileText, Database, Clock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { formatTime } from '@/lib/utils'

export const revalidate = 30

function statusColor(s: string) {
  const map: Record<string, string> = {
    pending_approval: 'var(--accent)',
    approved: 'var(--green)',
    rejected: 'var(--red)',
    executed: 'var(--blue)',
  }
  return map[s] ?? 'var(--muted)'
}

function actionIcon(type: string | null): LucideIcon {
  const t = (type ?? '').toLowerCase()
  if (t.includes('email') || t.includes('mail')) return Mail
  if (t.includes('calendar') || t.includes('event') || t.includes('schedule')) return Calendar
  if (t.includes('memory') || t.includes('db') || t.includes('data')) return Database
  if (t.includes('note') || t.includes('draft') || t.includes('doc')) return FileText
  return Zap
}

export default async function AgentActionsPage() {
  const { data } = await supabase
    .from('agent_actions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  const all = data ?? []
  const pending = all.filter(a => a.status === 'pending_approval')
  const executed = all.filter(a => a.status === 'executed')

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '18px 16px 40px' }}>
      {/* Header */}
      <div className="rise rise-1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <h1 className="h-hero" style={{ margin: 0, fontSize: 26 }}>Agent Actions</h1>
        <span className="grad-icon" style={{ width: 38, height: 38, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}><Zap size={18} color="var(--accent)" /></span>
      </div>
      <p className="rise rise-1" style={{ color: 'var(--foreground-2)', fontSize: 13, margin: '0 0 20px' }}>Everything Atlas does, logged here</p>

      {all.length > 0 && (
        <div className="rise rise-2" style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
          <div className="stat-tile" style={{ flex: 1 }}>
            <div className="stat-num" style={{ color: 'var(--foreground)' }}>{all.length}</div>
            <div className="stat-cap">Total</div>
          </div>
          <div className="stat-tile" style={{ flex: 1 }}>
            <div className="stat-num" style={{ color: 'var(--accent)' }}>{pending.length}</div>
            <div className="stat-cap" style={{ color: 'var(--accent)' }}>Pending</div>
          </div>
          <div className="stat-tile" style={{ flex: 1 }}>
            <div className="stat-num" style={{ color: 'var(--blue)' }}>{executed.length}</div>
            <div className="stat-cap" style={{ color: 'var(--blue)' }}>Executed</div>
          </div>
        </div>
      )}

      {all.length === 0 ? (
        <div className="pcard rise rise-3" style={{ padding: '52px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          No agent actions yet — Atlas logs all actions here
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {all.map((a, i) => {
            const color = statusColor(a.status)
            const Icon = actionIcon(a.action_type)
            return (
              <div key={a.id} className={`pcard rise rise-${Math.min(6, (i % 6) + 1)}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 13, padding: '13px 15px' }}>
                <span className="grad-icon" style={{ width: 40, height: 40, background: `${color}1c`, borderRadius: 12, flexShrink: 0 }}><Icon size={19} color={color} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                    <span className="pillar-tag" style={{ color, background: `color-mix(in srgb, ${color} 16%, transparent)` }}>
                      {a.status.replace(/_/g, ' ')}
                    </span>
                    {a.action_type && <span style={{ fontSize: 11, color: 'var(--foreground-2)' }}>{a.action_type}</span>}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: 'var(--muted)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                      <Clock size={10} /> {formatTime(a.created_at)}
                    </span>
                  </div>
                  <div style={{ fontSize: 13.5, color: 'var(--foreground)', lineHeight: 1.45 }}>
                    {a.description}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
