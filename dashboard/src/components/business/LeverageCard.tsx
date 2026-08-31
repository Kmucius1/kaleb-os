import { supabase } from '@/lib/supabase'
import { leverageOf, WORK_TYPE_META, WORK_TYPES } from '@/lib/workType'

// How the office day actually splits.
//
// The number that matters is the delegable one. The season's aim is for DRYP
// time to trend toward CEO and Builder, which only happens if the admin and
// management piles are visible enough to hand off.

export default async function LeverageCard() {
  const { data } = await supabase.from('tasks')
    .select('work_type').in('status', ['pending', 'in_progress'])
  const l = leverageOf((data ?? []) as { work_type: string | null }[])
  if (l.classified === 0) return null

  return (
    <section className="card2 rise rise-2" style={{ padding: 16, margin: '0 0 20px' }}>
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <span className="section-label">Where the work is</span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{l.classified} open</span>
      </header>

      {/* One bar, four segments — the shape is the point, not the numbers. */}
      <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
        {WORK_TYPES.map(t => {
          const n = l.counts[t]
          if (!n) return null
          return (
            <div key={t} title={`${WORK_TYPE_META[t].label}: ${n}`}
              style={{ width: `${(n / l.classified) * 100}%`, background: WORK_TYPE_META[t].color }} />
          )
        })}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginBottom: 14 }}>
        {WORK_TYPES.map(t => (
          <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--foreground-2)' }}>
            <i style={{ width: 8, height: 8, borderRadius: 2, background: WORK_TYPE_META[t].color }} />
            {WORK_TYPE_META[t].label}
            <b style={{ color: 'var(--foreground)', fontVariantNumeric: 'tabular-nums' }}>{l.counts[t]}</b>
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 24, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{l.leveragePct}%</div>
          <div className="stat-cap">High leverage</div>
          <div className="stat-sub">CEO + Builder</div>
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: 'var(--yellow)' }}>
            {l.delegable}
          </div>
          <div className="stat-cap">Could be handed off</div>
          <div className="stat-sub">{l.delegablePct}% of classified work</div>
        </div>
      </div>

      {l.counts.unclassified > 0 && (
        <p style={{ fontSize: 11, color: 'var(--muted)', margin: '10px 0 0' }}>
          {l.counts.unclassified} task{l.counts.unclassified === 1 ? '' : 's'} the rules could not place — left
          unclassified rather than guessed into a bucket.
        </p>
      )}
    </section>
  )
}
