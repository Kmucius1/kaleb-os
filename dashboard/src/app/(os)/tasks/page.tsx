import { supabase } from '@/lib/supabase'
import { formatTime } from '@/lib/utils'
import { Circle, LoaderCircle, CheckCircle2, XCircle, type LucideIcon } from 'lucide-react'

export const revalidate = 60

type Task = {
  id: string
  title: string
  description: string | null
  status: string
  goal_id: string | null
  created_at: string
}

function statusMeta(status: string): { color: string; dim: string; Icon: LucideIcon } {
  const map: Record<string, { color: string; dim: string; Icon: LucideIcon }> = {
    pending: { color: '#fbbf24', dim: 'var(--yellow-dim)', Icon: Circle },
    in_progress: { color: '#60a5fa', dim: 'var(--blue-dim)', Icon: LoaderCircle },
    completed: { color: 'var(--green)', dim: 'var(--green-dim)', Icon: CheckCircle2 },
    cancelled: { color: 'var(--red)', dim: 'var(--red-dim)', Icon: XCircle },
  }
  return map[status] ?? { color: 'var(--muted)', dim: 'var(--surface-3)', Icon: Circle }
}

export default async function TasksPage() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })

  const all: Task[] = data ?? []
  const pending = all.filter(t => t.status === 'pending')
  const inProgress = all.filter(t => t.status === 'in_progress')
  const completed = all.filter(t => t.status === 'completed')

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '18px 16px 40px' }}>
      {/* Title */}
      <div className="rise rise-1" style={{ marginBottom: 20 }}>
        <h1 className="h-hero" style={{ margin: 0 }}>Tasks</h1>
        <p style={{ color: 'var(--foreground-2)', fontSize: 14, lineHeight: 1.5, margin: '8px 0 0' }}>
          {all.length} total{all.length ? ' — everything actionable, in one place.' : ''}
        </p>
      </div>

      {/* Stat tiles */}
      <div className="rise rise-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
        <div className="stat-tile">
          <div className="stat-num" style={{ color: '#fbbf24' }}>{pending.length}</div>
          <div className="stat-cap">Pending</div>
        </div>
        <div className="stat-tile">
          <div className="stat-num" style={{ color: '#60a5fa' }}>{inProgress.length}</div>
          <div className="stat-cap">In Progress</div>
        </div>
        <div className="stat-tile">
          <div className="stat-num" style={{ color: 'var(--green)' }}>{completed.length}</div>
          <div className="stat-cap">Done</div>
        </div>
      </div>

      {error && (
        <div className="card2 rise rise-3" style={{ color: 'var(--red)', fontSize: 12.5, marginBottom: 16, borderColor: 'var(--red)' }}>
          Error: {error.message}
        </div>
      )}

      {all.length === 0 ? (
        <div className="pcard rise rise-3" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ color: 'var(--foreground-2)', fontSize: 14, marginBottom: 8 }}>No tasks yet</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
            Ask Atlas: &ldquo;process my captures and create tasks from anything actionable&rdquo;
          </div>
        </div>
      ) : (
        <>
          <div className="label rise rise-3" style={{ margin: '0 4px 12px' }}>All Tasks</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {all.map((t, i) => {
              const { color, dim, Icon } = statusMeta(t.status)
              const done = t.status === 'completed' || t.status === 'cancelled'
              return (
                <div key={t.id} className={`pcard press rise rise-${Math.min(7, (i % 7) + 1)}`} style={{
                  display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px 13px 13px',
                  position: 'relative', overflow: 'hidden', opacity: done ? 0.62 : 1,
                }}>
                  <span style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 4, borderRadius: 4, background: color }} />
                  <span className="grad-icon" style={{ width: 40, height: 40, background: dim, borderRadius: 12, flexShrink: 0 }}><Icon size={19} color={color} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 15, fontWeight: 700, color: 'var(--foreground)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      textDecoration: done ? 'line-through' : 'none',
                    }}>
                      {t.title}
                    </div>
                    {t.description && (
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.description}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                    <span className="pillar-tag" style={{ color, background: dim }}>
                      {t.status.replace('_', ' ')}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{formatTime(t.created_at)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
