import { supabase } from '@/lib/supabase'
import { formatTime } from '@/lib/utils'
import { Target, Bell, Sparkles } from 'lucide-react'

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
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '18px 16px 40px' }}>
      {/* Title */}
      <div className="rise rise-1" style={{ marginBottom: 22 }}>
        <div className="label" style={{ marginBottom: 8 }}>{now}</div>
        <h1 className="h-hero" style={{ margin: 0 }}>Daily <span style={{ color: 'var(--accent)' }}>Briefing</span></h1>
      </div>

      {/* Overview */}
      <div className="rise rise-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        <div className="stat-tile" style={{ padding: 14 }}>
          <div className="stat-num" style={{ color: 'var(--accent)' }}>{priorities.length}</div>
          <div className="stat-cap">Priorities</div>
        </div>
        <div className="stat-tile" style={{ padding: 14 }}>
          <div className="stat-num" style={{ color: 'var(--money)' }}>{allTasks.length}</div>
          <div className="stat-cap">Reminders</div>
        </div>
        <div className="stat-tile" style={{ padding: 14 }}>
          <div className="stat-num">{all.length}</div>
          <div className="stat-cap">Atlas Recs</div>
        </div>
      </div>

      {/* Top 3 Priorities */}
      <div className="pcard rise rise-3" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span className="grad-icon" style={{ width: 34, height: 34, background: 'var(--accent-dim)', borderRadius: 11 }}><Target size={17} color="var(--accent)" /></span>
          <span className="label">Top 3 Priorities</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {priorities.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
              <span style={{
                width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-grad)',
                color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0,
              }}>{i + 1}</span>
              <span style={{ fontSize: 14.5, color: 'var(--foreground)', lineHeight: 1.5, paddingTop: 2 }}>{p}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reminders */}
      <div className="pcard rise rise-4" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: allTasks.length === 0 ? 0 : 12 }}>
          <span className="grad-icon" style={{ width: 34, height: 34, background: 'color-mix(in srgb, var(--money) 16%, transparent)', borderRadius: 11 }}><Bell size={17} color="var(--money)" /></span>
          <span className="label">Reminders</span>
          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginLeft: 'auto' }}>{allTasks.length}</span>
        </div>
        {allTasks.length === 0 ? (
          <div style={{ color: 'var(--muted)', fontSize: 13, padding: '16px 0 4px', textAlign: 'center' }}>— all clear —</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {allTasks.slice(0, 6).map((t, i) => (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 11,
                padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)',
              }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--money)', marginTop: 6, flexShrink: 0, boxShadow: '0 0 8px var(--money)' }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: 'var(--foreground)', fontWeight: 500 }}>{t.title}</div>
                  {t.description && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, lineHeight: 1.45 }}>{t.description.slice(0, 80)}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Atlas Recommendations */}
      <div className="rise rise-5" style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 4px 14px' }}>
        <span className="grad-icon" style={{ width: 34, height: 34, background: 'color-mix(in srgb, var(--accent-2) 16%, transparent)', borderRadius: 11 }}><Sparkles size={17} color="var(--accent-2)" /></span>
        <span className="label">Atlas Recommendations</span>
        <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginLeft: 'auto' }}>{all.length}</span>
      </div>
      {all.length === 0 ? (
        <div className="pcard rise rise-5" style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '28px 16px' }}>
          <div style={{ marginBottom: 6 }}>— no recommendations yet —</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted-2)' }}>Ask Atlas: &quot;analyze my priorities and give me today&apos;s recommendations&quot;</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {all.map((r, i) => (
            <div key={r.id} className={`pcard rise rise-${Math.min(7, (i % 3) + 5)}`} style={{ position: 'relative', overflow: 'hidden' }}>
              <span style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 3.5, borderRadius: 4, background: 'var(--accent-grad)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.01em' }}>{r.title}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{formatTime(r.created_at)}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--foreground-2)', lineHeight: 1.55 }}>{r.description}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
