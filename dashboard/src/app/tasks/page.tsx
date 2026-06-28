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
    pending: '#f59e0b',
    in_progress: '#3b82f6',
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
          TASKS
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 10 }}>
          {all.length} total
          {pending.length > 0 && <span style={{ color: '#f59e0b' }}> · {pending.length} pending</span>}
          {inProgress.length > 0 && <span style={{ color: '#3b82f6' }}> · {inProgress.length} in progress</span>}
          {completed.length > 0 && <span style={{ color: 'var(--green)' }}> · {completed.length} done</span>}
        </div>
      </div>

      {error && (
        <div style={{ color: 'var(--red)', fontSize: 11, marginBottom: 16 }}>
          Error: {error.message}
        </div>
      )}

      {all.length === 0 ? (
        <div style={{
          color: 'var(--muted)',
          fontSize: 11,
          padding: '60px 0',
          textAlign: 'center',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
        }}>
          <div style={{ marginBottom: 8 }}>— no tasks yet —</div>
          <div style={{ fontSize: 10, color: '#333' }}>
            Tell Hermes: "process my captures and create tasks from anything actionable"
          </div>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.09em', textAlign: 'left' }}>
              <th style={{ paddingBottom: 8, fontWeight: 400, width: 90 }}>STATUS</th>
              <th style={{ paddingBottom: 8, fontWeight: 400 }}>TITLE</th>
              <th style={{ paddingBottom: 8, fontWeight: 400 }}>DESCRIPTION</th>
              <th style={{ paddingBottom: 8, fontWeight: 400, width: 120, textAlign: 'right' }}>CREATED</th>
            </tr>
          </thead>
          <tbody>
            {all.map((t, i) => (
              <tr
                key={t.id}
                style={{
                  borderBottom: '1px solid #161616',
                  background: i % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent',
                }}
              >
                <td style={{ padding: '10px 16px 10px 0' }}>
                  <span style={{
                    color: statusColor(t.status),
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}>
                    {t.status.replace('_', ' ')}
                  </span>
                </td>
                <td style={{ padding: '10px 16px 10px 0', maxWidth: 280 }}>
                  <div style={{ fontSize: 12, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.title}
                  </div>
                </td>
                <td style={{ padding: '10px 16px 10px 0', maxWidth: 420 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.description ?? '—'}
                  </div>
                </td>
                <td style={{ padding: '10px 0', fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap', textAlign: 'right' }}>
                  {formatTime(t.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
