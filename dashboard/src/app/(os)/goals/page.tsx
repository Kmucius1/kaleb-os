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
    <div className="page-pad" style={{ maxWidth: 760, margin: '0 auto' }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '2px 0 4px' }}>
        <h1 style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Goals</h1>
        <span className="pillar-tag" style={{ color: 'var(--accent)', background: 'var(--accent-dim)' }}>Phase 5</span>
      </div>
      <p style={{ color: 'var(--foreground-2)', fontSize: 13.5, margin: '0 0 20px' }}>
        {hasGoals ? `${all.length} goals set — ranked by priority.` : 'The six priorities, ranked and tracked.'}
      </p>

      {hasGoals ? (
        <>
          <div className="section-label" style={{ marginBottom: 12 }}>Active Goals</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {all.map((g: any, i: number) => {
              const status = (g.status ?? 'active').toUpperCase()
              const statusColor = status === 'ACTIVE' ? 'var(--green)' : status === 'DONE' || status === 'COMPLETED' ? 'var(--accent)' : 'var(--muted)'
              return (
                <div key={g.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '13px 14px',
                  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--accent-dim)', color: 'var(--accent)', fontSize: 15, fontWeight: 800,
                  }}>
                    {g.priority ?? i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>{g.title}</div>
                    {g.description && (
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4, marginTop: 2 }}>{g.description}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                    <span className="pillar-tag" style={{ color: statusColor, background: statusColor === 'var(--green)' ? 'var(--green-dim)' : 'var(--accent-dim)' }}>{status}</span>
                    <span style={{ fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{g.due_date ?? '—'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <>
          <div className="card2" style={{ marginBottom: 24 }}>
            <div className="section-label" style={{ marginBottom: 8 }}>No Goals Yet</div>
            <div style={{ fontSize: 13.5, color: 'var(--foreground)', lineHeight: 1.6, marginBottom: 10 }}>
              Track goals, weekly accountability challenges, and execution audits here. Set them up by asking Atlas.
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
              Ask Atlas: &ldquo;set up my six priorities as goals&rdquo;
            </div>
          </div>

          <div className="section-label" style={{ marginBottom: 12 }}>Six Priorities — Will Become Goals</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SIX_PRIORITIES.map(p => (
              <div key={p.rank} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '13px 14px',
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, opacity: 0.6,
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--accent-dim)', color: 'var(--accent)', fontSize: 15, fontWeight: 800,
                }}>
                  {p.rank}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>{p.label}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{p.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
