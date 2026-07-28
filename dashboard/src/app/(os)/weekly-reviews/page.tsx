import Link from 'next/link'
import { CalendarCheck, Info, Waves } from 'lucide-react'
import { buildWeeklyReview } from '@/lib/rhythm/weekly'
import { PILLAR_META } from '@/lib/rhythm/pillars'

export const dynamic = 'force-dynamic'

// Sunday's Reset Day surface: what the week actually did, pillar by pillar.
// No blended score — six honest numbers and the gaps named out loud.

const fmtDay = (s: string) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${s}T12:00:00Z`))

export default async function WeeklyReviewPage() {
  const r = await buildWeeklyReview()

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '18px 16px 40px' }}>
      <header className="rise rise-1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="h-hero" style={{ margin: 0, fontSize: 26 }}>Weekly Review</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '6px 0 0' }}>
            {fmtDay(r.weekStart)} – {fmtDay(r.weekEnd)} · {r.elapsedDays} of 7 days
          </p>
        </div>
        <span className="grad-icon" style={{ width: 40, height: 40, background: 'var(--accent-dim)', borderRadius: 13 }}>
          <CalendarCheck size={19} color="var(--accent)" />
        </span>
      </header>

      <section className="pcard rise rise-2" style={{ marginBottom: 14 }}>
        <div className="label" style={{ marginBottom: 14 }}>Consistency by pillar</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {r.byPillar.map(p => {
            const color = PILLAR_META[p.pillar].color
            return (
              <div key={p.pillar}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{p.pillar}</span>
                  <span className="tabular" style={{ fontSize: 11.5, color: p.of === 0 ? 'var(--muted-2)' : 'var(--muted)' }}>
                    {p.of === 0 ? 'no blocks' : `${p.done}/${p.of} · ${p.pct}%`}
                  </span>
                </div>
                <span style={{ display: 'block', height: 6, borderRadius: 3, background: 'var(--surface-2)', overflow: 'hidden' }}>
                  <span style={{ display: 'block', width: `${p.pct}%`, height: '100%', borderRadius: 3, background: color }} />
                </span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="pcard rise rise-3" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
          <Waves size={15} color="var(--spirit)" />
          <span className="label">Horizon Walk</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>{r.horizon.done}</span>
          <span style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 600 }}>/ {r.horizon.ideal}</span>
        </div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 9 }}>
          {Array.from({ length: r.horizon.ideal }, (_, i) => (
            <span key={i} style={{
              flex: 1, height: 6, borderRadius: 3,
              background: i < r.horizon.done ? 'var(--spirit)' : 'var(--surface-2)',
              outline: i === r.horizon.minimum - 1 ? '1px solid color-mix(in srgb, var(--spirit) 45%, transparent)' : 'none',
            }} />
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          {r.horizon.metMinimum
            ? `Floor of ${r.horizon.minimum} cleared.`
            : `${r.horizon.minimum - r.horizon.done} more clears the floor of ${r.horizon.minimum}.`}
        </div>
      </section>

      <section className="stat-grid rise rise-4" style={{ marginBottom: 14 }}>
        <div className="stat-tile">
          <div className="stat-num">{r.journals}</div>
          <div className="stat-cap">Journals</div>
        </div>
        <div className="stat-tile">
          <div className="stat-num" style={{ color: 'var(--green)' }}>{r.tasksCompleted}</div>
          <div className="stat-cap">Tasks done</div>
        </div>
        <div className="stat-tile">
          <div className="stat-num">{r.tasksOpen}</div>
          <div className="stat-cap">Still open</div>
        </div>
        <div className="stat-tile">
          <div className="stat-num">{r.elapsedDays}</div>
          <div className="stat-cap">Days in</div>
          <div className="stat-sub">of 7</div>
        </div>
      </section>

      {r.habits.length > 0 && (
        <section className="pcard rise rise-5" style={{ marginBottom: 14 }}>
          <div className="label" style={{ marginBottom: 12 }}>Habits</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {r.habits.map(h => (
              <div key={h.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ flex: 1, fontSize: 13, color: 'var(--foreground-2)' }}>{h.name}</span>
                <div style={{ display: 'flex', gap: 3 }}>
                  {Array.from({ length: h.of }, (_, i) => (
                    <span key={i} style={{
                      width: 9, height: 9, borderRadius: 3,
                      background: i < h.done ? 'var(--green)' : 'var(--surface-3)',
                    }} />
                  ))}
                </div>
                <span className="tabular" style={{ fontSize: 11.5, color: 'var(--muted)', width: 34, textAlign: 'right' }}>
                  {h.done}/{h.of}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {r.missing.length > 0 && (
        <section className="pcard rise rise-6" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
            <Info size={13} color="var(--muted)" />
            <span className="label">What this review can’t see</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {r.missing.map((m, i) => (
              <li key={i} style={{ fontSize: 12.5, color: 'var(--foreground-2)', lineHeight: 1.45 }}>{m}</li>
            ))}
          </ul>
        </section>
      )}

      <Link href="/atlas" className="press rise rise-6" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 50,
        borderRadius: 14, background: 'var(--accent)', color: '#fff', fontSize: 14.5, fontWeight: 700,
      }}>
        Talk it through with Atlas
      </Link>
    </div>
  )
}
