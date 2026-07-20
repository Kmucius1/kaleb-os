import { supabase } from '@/lib/supabase'
import { Calendar } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export const revalidate = 300

export default async function WeeklyReviewsPage() {
  const { data } = await supabase
    .from('execution_audits')
    .select('*')
    .order('period_start', { ascending: false })

  const all = data ?? []

  return (
    <div className="page-pad" style={{ maxWidth: 820, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22, flexWrap: 'wrap' }}>
        <Calendar size={20} color="var(--accent)" />
        <h1 style={{ color: 'var(--foreground)', fontWeight: 800, fontSize: 25, letterSpacing: '-0.02em', margin: 0 }}>Weekly Reviews</h1>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{all.length} reviews</span>
      </div>

      <div className="card2" style={{ borderLeft: '3px solid var(--accent)', marginBottom: 24 }}>
        <div className="section-label" style={{ marginBottom: 8 }}>Weekly Accountability</div>
        <div style={{ fontSize: 13.5, color: 'var(--foreground-2)', lineHeight: 1.6 }}>
          Capture weekly reflections, track execution vs. commitments, and surface accountability data here.
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
          Get started by asking Atlas: &ldquo;set up my weekly review cadence&rdquo;
        </div>
      </div>

      {all.length === 0 ? (
        <div className="card2" style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>No reviews yet</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {all.map((r: any) => (
            <div key={r.id} className="card2">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: r.notes ? 10 : 0, gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>
                  Week of {r.period_start ? formatDate(r.period_start) : '—'}
                </span>
                <span style={{ fontSize: 11.5, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                  {r.goals_completed ?? 0} / {r.goals_set ?? 0} goals completed
                </span>
              </div>
              {r.notes && <div style={{ fontSize: 12.5, color: 'var(--foreground-2)', lineHeight: 1.55 }}>{r.notes}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
