import { supabase } from '@/lib/supabase'
import { formatTime } from '@/lib/utils'

export const revalidate = 120

type Idea = {
  id: string
  title: string
  description: string | null
  category: string | null
  priority: string | null
  status: string | null
  source_ref: string | null
  created_at: string
}

function priorityColor(priority: string | null) {
  const map: Record<string, string> = {
    high: 'var(--accent)',
    medium: '#f59e0b',
    low: 'var(--muted)',
  }
  return map[priority ?? ''] ?? 'var(--muted)'
}

export default async function IdeasPage() {
  const { data, error } = await supabase
    .from('ideas')
    .select('*')
    .order('created_at', { ascending: false })

  const all: Idea[] = data ?? []
  const hasIdeas = all.length > 0

  return (
    <div style={{ padding: '20px 28px', maxWidth: 1200 }}>
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 12,
        marginBottom: 24,
        paddingBottom: 16,
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em' }}>
          IDEAS
        </div>
        <span style={{
          fontSize: 9,
          color: hasIdeas ? 'var(--accent)' : 'var(--muted)',
          border: `1px solid ${hasIdeas ? 'rgba(255,102,0,0.4)' : 'var(--border)'}`,
          padding: '2px 6px',
          letterSpacing: '0.06em',
        }}>
          PHASE 6
        </span>
        {hasIdeas && (
          <div style={{ color: 'var(--muted)', fontSize: 10 }}>{all.length} ideas captured</div>
        )}
      </div>

      {!hasIdeas && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderLeft: '3px solid #222',
          padding: '20px 24px',
          marginBottom: 32,
        }}>
          <div style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.08em', marginBottom: 8 }}>
            PHASE 6 — NOT YET ACTIVE
          </div>
          <div style={{ fontSize: 12, color: 'var(--foreground)', lineHeight: 1.7, marginBottom: 12 }}>
            Phase 6 activates content idea surfacing. Hermes will extract ideas from captures, voice notes,
            and emails — drafting posts and tracking which content converts followers into business leads.
          </div>
          <div style={{ fontSize: 10, color: '#333', fontStyle: 'italic' }}>
            Tell Hermes: "start surfacing content ideas from my captures and voice notes"
          </div>
        </div>
      )}

      {hasIdeas && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.09em', textAlign: 'left' }}>
              <th style={{ paddingBottom: 8, fontWeight: 400, width: 80 }}>PRIORITY</th>
              <th style={{ paddingBottom: 8, fontWeight: 400, width: 100 }}>CATEGORY</th>
              <th style={{ paddingBottom: 8, fontWeight: 400 }}>IDEA</th>
              <th style={{ paddingBottom: 8, fontWeight: 400, width: 80 }}>STATUS</th>
              <th style={{ paddingBottom: 8, fontWeight: 400, width: 120, textAlign: 'right' }}>CAPTURED</th>
            </tr>
          </thead>
          <tbody>
            {all.map((idea, i) => (
              <tr key={idea.id} style={{ borderBottom: '1px solid #161616', background: i % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                <td style={{ padding: '10px 16px 10px 0' }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: priorityColor(idea.priority), letterSpacing: '0.06em' }}>
                    {(idea.priority ?? '—').toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '10px 16px 10px 0', fontSize: 10, color: 'var(--muted)' }}>
                  {idea.category ?? '—'}
                </td>
                <td style={{ padding: '10px 16px 10px 0' }}>
                  <div style={{ fontSize: 12, color: 'var(--foreground)', marginBottom: idea.description ? 3 : 0 }}>
                    {idea.title}
                  </div>
                  {idea.description && (
                    <div style={{ fontSize: 10, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>
                      {idea.description}
                    </div>
                  )}
                </td>
                <td style={{ padding: '10px 16px 10px 0', fontSize: 9, color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.06em' }}>
                  {(idea.status ?? '—').toUpperCase()}
                </td>
                <td style={{ padding: '10px 0', fontSize: 10, color: 'var(--muted)', textAlign: 'right' }}>
                  {formatTime(idea.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
