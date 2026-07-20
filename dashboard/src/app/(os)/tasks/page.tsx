import { supabase } from '@/lib/supabase'
import { formatTime } from '@/lib/utils'

export const revalidate = 60

type Task = {
  id: string
  title: string
  description: string | null
  status: string
  goal_id: string | null
  created_at: string
}

function statusColor(status: string) {
  const map: Record<string, string> = {
    pending: '#fbbf24',
    in_progress: '#60a5fa',
    completed: 'var(--green)',
    cancelled: 'var(--red)',
  }
  return map[status] ?? 'var(--muted)'
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
    <div className="page-pad" style={{ maxWidth: 760, margin: '0 auto' }}>
      {/* Title */}
      <h1 style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-0.02em', margin: '2px 0 4px' }}>Tasks</h1>
      <p style={{ color: 'var(--foreground-2)', fontSize: 13.5, margin: '0 0 20px' }}>
        {all.length} total{all.length ? ' — everything actionable, in one place.' : ''}
      </p>

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
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
        <div className="card2" style={{ color: 'var(--red)', fontSize: 12.5, marginBottom: 16, borderColor: 'var(--red)' }}>
          Error: {error.message}
        </div>
      )}

      {all.length === 0 ? (
        <div className="card2" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ color: 'var(--foreground-2)', fontSize: 14, marginBottom: 8 }}>No tasks yet</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
            Ask Atlas: &ldquo;process my captures and create tasks from anything actionable&rdquo;
          </div>
        </div>
      ) : (
        <>
          <div className="section-label" style={{ marginBottom: 12 }}>All Tasks</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {all.map(t => {
              const color = statusColor(t.status)
              const done = t.status === 'completed' || t.status === 'cancelled'
              return (
                <div key={t.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px',
                  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
                }}>
                  <div className="tl-bar" style={{ background: color, minHeight: 34 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 700, color: 'var(--foreground)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.6 : 1,
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
                    <span className="pillar-tag" style={{ color, background: `${color === 'var(--green)' ? 'var(--green-dim)' : color === 'var(--red)' ? 'var(--red-dim)' : color + '1f'}` }}>
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
