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
    <div style={{ padding: '24px 28px', maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <Calendar size={16} color="var(--accent)" />
        <span style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: 16, letterSpacing: '0.06em' }}>WEEKLY REVIEWS</span>
        <span style={{ color: 'var(--muted)', fontSize: 11 }}>{all.length} reviews</span>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid #222', borderRadius: 6, padding: '20px 24px', marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 8 }}>WEEKLY ACCOUNTABILITY</div>
        <div style={{ fontSize: 12, color: 'var(--foreground)', lineHeight: 1.7 }}>
          Capture weekly reflections, track execution vs. commitments, and surface accountability data here.
        </div>
        <div style={{ marginTop: 10, fontSize: 10, color: '#333' }}>
          Get started by asking Atlas: "set up my weekly review cadence"
        </div>
      </div>

      {all.length === 0 ? (
        <div style={{ color: 'var(--muted)', fontSize: 11, textAlign: 'center', padding: '40px 0' }}>— no reviews yet —</div>
      ) : (
        all.map((r: any) => (
          <div key={r.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '16px', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>
                Week of {r.period_start ? formatDate(r.period_start) : '—'}
              </span>
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                {r.goals_completed ?? 0} / {r.goals_set ?? 0} goals completed
              </span>
            </div>
            {r.notes && <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>{r.notes}</div>}
          </div>
        ))
      )}
    </div>
  )
}
