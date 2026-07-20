import { supabase } from '@/lib/supabase'
import { CalendarCheck, Sparkles, CheckCircle2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export const revalidate = 300

export default async function WeeklyReviewsPage() {
  const { data } = await supabase
    .from('execution_audits')
    .select('*')
    .order('period_start', { ascending: false })

  const all = data ?? []

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '18px 16px 40px' }}>
      {/* Header */}
      <div className="rise rise-1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 className="h-hero" style={{ margin: 0, fontSize: 26 }}>Weekly Reviews</h1>
          <p style={{ color: 'var(--foreground-2)', fontSize: 13, margin: '6px 0 0' }}>{all.length} {all.length === 1 ? 'review' : 'reviews'}</p>
        </div>
        <span className="grad-icon" style={{ width: 40, height: 40, background: 'var(--accent-dim)', borderRadius: 13 }}><CalendarCheck size={19} color="var(--accent)" /></span>
      </div>

      {/* Intro card */}
      <div className="pcard rise rise-2" style={{ display: 'flex', alignItems: 'flex-start', gap: 13, marginBottom: 26 }}>
        <span className="grad-icon" style={{ width: 34, height: 34, background: 'var(--accent-dim)', borderRadius: 11, flexShrink: 0 }}><Sparkles size={17} color="var(--accent)" /></span>
        <div>
          <div className="label" style={{ marginBottom: 8 }}>Weekly Accountability</div>
          <div style={{ fontSize: 13.5, color: 'var(--foreground-2)', lineHeight: 1.6 }}>
            Capture weekly reflections, track execution vs. commitments, and surface accountability data here.
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
            Get started by asking Atlas: &ldquo;set up my weekly review cadence&rdquo;
          </div>
        </div>
      </div>

      {all.length === 0 ? (
        <div className="pcard rise rise-3" style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '44px 0' }}>No reviews yet</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {all.map((r: any, i: number) => {
            const set = r.goals_set ?? 0
            const done = r.goals_completed ?? 0
            const pct = set > 0 ? Math.round((done / set) * 100) : 0
            const color = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--money)' : 'var(--foreground-2)'
            return (
              <div key={r.id} className={`pcard rise rise-${Math.min(7, i + 3)}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: r.notes ? 12 : 0 }}>
                  <span className="grad-icon" style={{ width: 38, height: 38, background: `color-mix(in srgb, ${color} 16%, transparent)`, borderRadius: 12, flexShrink: 0 }}><CheckCircle2 size={19} color={color} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--foreground)' }}>
                      Week of {r.period_start ? formatDate(r.period_start) : '—'}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                      {done} / {set} goals completed
                    </div>
                  </div>
                  <span className="pillar-tag" style={{ color, background: `color-mix(in srgb, ${color} 15%, transparent)` }}>{pct}%</span>
                </div>
                {/* Progress bar */}
                {set > 0 && (
                  <div style={{ height: 5, borderRadius: 4, background: 'var(--surface-3)', overflow: 'hidden', marginBottom: r.notes ? 12 : 0 }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 4, background: color }} />
                  </div>
                )}
                {r.notes && <div style={{ fontSize: 12.5, color: 'var(--foreground-2)', lineHeight: 1.55 }}>{r.notes}</div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
