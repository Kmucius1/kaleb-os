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
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '18px 16px 40px' }}>
      {/* Title */}
      <div className="rise rise-1" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 className="h-hero" style={{ margin: 0 }}>Goals</h1>
          <span className="pillar-tag" style={{ color: 'var(--accent)', background: 'var(--accent-dim)' }}>Phase 5</span>
        </div>
        <p style={{ color: 'var(--foreground-2)', fontSize: 14, lineHeight: 1.5, margin: '8px 0 0' }}>
          {hasGoals ? `${all.length} goals set — ranked by priority.` : 'The six priorities, ranked and tracked.'}
        </p>
      </div>

      {hasGoals ? (
        <>
          <div className="label rise rise-2" style={{ margin: '0 4px 12px' }}>Active Goals</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {all.map((g: any, i: number) => {
              const status = (g.status ?? 'active').toUpperCase()
              const isActive = status === 'ACTIVE'
              const isDone = status === 'DONE' || status === 'COMPLETED'
              const color = isActive ? 'var(--green)' : isDone ? 'var(--accent)' : 'var(--muted)'
              const dim = isActive ? 'var(--green-dim)' : isDone ? 'var(--accent-dim)' : 'var(--surface-3)'
              return (
                <div key={g.id} className={`pcard press rise rise-${Math.min(7, (i % 6) + 2)}`} style={{
                  display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px 13px 13px',
                  position: 'relative', overflow: 'hidden',
                }}>
                  <span style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 4, borderRadius: 4, background: color }} />
                  <span className="grad-icon" style={{
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    background: 'var(--accent-dim)', color: 'var(--accent)', fontSize: 16, fontWeight: 800,
                  }}>
                    {g.priority ?? i + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>{g.title}</div>
                    {g.description && (
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4, marginTop: 2 }}>{g.description}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                    <span className="pillar-tag" style={{ color, background: dim }}>{status}</span>
                    <span style={{ fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{g.due_date ?? '—'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <>
          <div className="pcard rise rise-2" style={{ marginBottom: 24 }}>
            <div className="label" style={{ marginBottom: 10 }}>No Goals Yet</div>
            <div style={{ fontSize: 14, color: 'var(--foreground)', lineHeight: 1.6, marginBottom: 10 }}>
              Track goals, weekly accountability challenges, and execution audits here. Set them up by asking Atlas.
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
              Ask Atlas: &ldquo;set up my six priorities as goals&rdquo;
            </div>
          </div>

          <div className="label rise rise-3" style={{ margin: '0 4px 12px' }}>Six Priorities — Will Become Goals</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SIX_PRIORITIES.map((p, i) => (
              <div key={p.rank} className={`pcard rise rise-${Math.min(7, (i % 5) + 3)}`} style={{
                display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px 13px 13px',
                position: 'relative', overflow: 'hidden', opacity: 0.62,
              }}>
                <span style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 4, borderRadius: 4, background: 'var(--border-2)' }} />
                <span className="grad-icon" style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: 'var(--accent-dim)', color: 'var(--accent)', fontSize: 16, fontWeight: 800,
                }}>
                  {p.rank}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>{p.label}</div>
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
