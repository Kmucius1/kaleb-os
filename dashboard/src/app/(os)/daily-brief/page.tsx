import { supabase } from '@/lib/supabase'
import { formatTime } from '@/lib/utils'

export const revalidate = 300

export default async function DailyBriefPage() {
  const { data: recommendations } = await supabase
    .from('agent_recommendations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  const now = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/New_York',
  })

  const all = recommendations ?? []
  const allTasks = tasks ?? []

  const priorities = [
    'Close / follow up on highest-value business opportunity',
    'Execute trading plan without discipline violation',
    'Capture or publish one content asset',
  ]

  return (
    <div className="page-pad" style={{ maxWidth: 760, margin: '0 auto' }}>
      {/* Title */}
      <h1 style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-0.02em', margin: '2px 0 4px' }}>Daily Briefing</h1>
      <p style={{ color: 'var(--foreground-2)', fontSize: 13.5, margin: '0 0 20px' }}>{now}</p>

      {/* Overview */}
      <div className="card2" style={{ marginBottom: 14 }}>
        <div className="section-label" style={{ marginBottom: 12 }}>Overview</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--accent)', lineHeight: 1 }}>{priorities.length}</div>
            <div className="stat-cap">Priorities</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--money)', lineHeight: 1 }}>{allTasks.length}</div>
            <div className="stat-cap">Reminders</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--foreground)', lineHeight: 1 }}>{all.length}</div>
            <div className="stat-cap">Atlas Recs</div>
          </div>
        </div>
      </div>

      {/* Top 3 Priorities */}
      <div className="card2" style={{ marginBottom: 14 }}>
        <div className="section-label" style={{ marginBottom: 12 }}>Top 3 Priorities</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {priorities.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{
                width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-grad)',
                color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0,
              }}>{i + 1}</span>
              <span style={{ fontSize: 14, color: 'var(--foreground)', lineHeight: 1.5, paddingTop: 2 }}>{p}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reminders */}
      <div className="card2" style={{ marginBottom: 24 }}>
        <div className="section-label" style={{ marginBottom: allTasks.length === 0 ? 0 : 8 }}>Reminders ({allTasks.length})</div>
        {allTasks.length === 0 ? (
          <div style={{ color: 'var(--muted)', fontSize: 13, padding: '16px 0 4px', textAlign: 'center' }}>— all clear —</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {allTasks.slice(0, 6).map((t, i) => (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '11px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)',
              }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--money)', marginTop: 6, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, color: 'var(--foreground)', fontWeight: 500 }}>{t.title}</div>
                  {t.description && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, lineHeight: 1.4 }}>{t.description.slice(0, 80)}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Atlas Recommendations */}
      <div className="section-label" style={{ marginBottom: 12 }}>Atlas Recommendations ({all.length})</div>
      {all.length === 0 ? (
        <div className="card2" style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '24px 16px' }}>
          <div style={{ marginBottom: 6 }}>— no recommendations yet —</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted-2)' }}>Ask Atlas: &quot;analyze my priorities and give me today&apos;s recommendations&quot;</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {all.map(r => (
            <div key={r.id} className="card2" style={{ borderLeft: '3px solid var(--accent)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: 5 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>{r.title}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{formatTime(r.created_at)}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--foreground-2)', lineHeight: 1.5 }}>{r.description}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
