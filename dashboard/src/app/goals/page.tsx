import { supabase } from '@/lib/supabase'

export const revalidate = 300

const SIX_PRIORITIES = [
  { rank: 1, label: 'Business profit', sub: 'EHM Strategies content brand' },
  { rank: 2, label: 'Trading profit', sub: 'discipline + consistency' },
  { rank: 3, label: 'Agency growth', sub: 'Advantage Media Agency' },
  { rank: 4, label: 'Personal brand', sub: '"One System. Built to Win."' },
  { rank: 5, label: 'Personal optimization', sub: 'health, focus, systems' },
  { rank: 6, label: 'Important relationships', sub: 'business + personal' },
]

export default async function GoalsPage() {
  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .order('created_at', { ascending: false })

  const all = goals ?? []
  const hasGoals = all.length > 0

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
          GOALS
        </div>
        <span style={{
          fontSize: 9,
          color: hasGoals ? 'var(--accent)' : 'var(--muted)',
          border: `1px solid ${hasGoals ? 'rgba(255,102,0,0.4)' : 'var(--border)'}`,
          padding: '2px 6px',
          letterSpacing: '0.06em',
        }}>
          PHASE 5
        </span>
        {hasGoals && (
          <div style={{ color: 'var(--muted)', fontSize: 10 }}>{all.length} goals set</div>
        )}
      </div>

      {!hasGoals && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderLeft: '3px solid #222',
          padding: '20px 24px',
          marginBottom: 32,
        }}>
          <div style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.08em', marginBottom: 8 }}>
            PHASE 5 — NOT YET ACTIVE
          </div>
          <div style={{ fontSize: 12, color: 'var(--foreground)', lineHeight: 1.7, marginBottom: 12 }}>
            Phase 5 activates goals tracking, weekly accountability challenges, and execution audits.
            Once Phase 4 (memory layer) is stable, tell Hermes to set up your goals in Telegram.
          </div>
          <div style={{ fontSize: 10, color: '#333', fontStyle: 'italic' }}>
            Tell Hermes: "set up my six priorities as goals in the database"
          </div>
        </div>
      )}

      {hasGoals ? (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.09em', textAlign: 'left' }}>
              <th style={{ paddingBottom: 8, fontWeight: 400, width: 50 }}>RANK</th>
              <th style={{ paddingBottom: 8, fontWeight: 400 }}>GOAL</th>
              <th style={{ paddingBottom: 8, fontWeight: 400, width: 90 }}>STATUS</th>
              <th style={{ paddingBottom: 8, fontWeight: 400, width: 100 }}>DUE</th>
            </tr>
          </thead>
          <tbody>
            {all.map((g: any, i: number) => (
              <tr key={g.id} style={{ borderBottom: '1px solid #161616' }}>
                <td style={{ padding: '10px 16px 10px 0', color: 'var(--accent)', fontSize: 14, fontWeight: 700 }}>
                  {g.priority ?? i + 1}
                </td>
                <td style={{ padding: '10px 16px 10px 0' }}>
                  <div style={{ fontSize: 12, color: 'var(--foreground)', marginBottom: 2 }}>{g.title}</div>
                  {g.description && (
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>{g.description}</div>
                  )}
                </td>
                <td style={{ padding: '10px 16px 10px 0', fontSize: 10, color: 'var(--green)', fontWeight: 700, letterSpacing: '0.06em' }}>
                  {(g.status ?? 'active').toUpperCase()}
                </td>
                <td style={{ padding: '10px 0', fontSize: 10, color: 'var(--muted)' }}>
                  {g.due_date ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <>
          <div style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 16 }}>
            SIX PRIORITIES — WILL BECOME GOALS
          </div>
          {SIX_PRIORITIES.map(p => (
            <div key={p.rank} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '12px 0',
              borderBottom: '1px solid #161616',
              opacity: 0.45,
            }}>
              <div style={{ color: 'var(--accent)', fontSize: 16, fontWeight: 700, width: 24, flexShrink: 0, textAlign: 'right' }}>
                {p.rank}
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--foreground)' }}>{p.label}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{p.sub}</div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
