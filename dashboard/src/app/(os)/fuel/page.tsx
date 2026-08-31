import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import FuelCapture from '@/components/fuel/FuelCapture'
import { getMeals, getDayFuel, etToday, insightsFor, trendOf, hitRate, trainingFrequency } from '@/lib/fuel'
import { PROTEIN_TARGET_G } from '@/lib/season/score'

export const dynamic = 'force-dynamic'

// Body. Trends first, then today's meals — because the brief is explicit that
// this system reads patterns rather than grading individual days.

const addDays = (d: string, n: number) => {
  const x = new Date(`${d}T12:00:00Z`)
  x.setUTCDate(x.getUTCDate() + n)
  return x.toISOString().slice(0, 10)
}

export default async function FuelPage() {
  const today = etToday()
  const from = addDays(today, -29)

  const [days, meals] = await Promise.all([getDayFuel(from, today), getMeals(today, today)])

  const weight = trendOf(days, d => d.weight_lb)
  const protein = hitRate(days, d => (d.meals > 0 ? d.protein_g : null), PROTEIN_TARGET_G)
  const training = trainingFrequency(days.slice(-7))
  const insights = insightsFor(days, { protein: PROTEIN_TARGET_G })

  const todayRow = days[days.length - 1]
  const confirmed = meals.filter(m => m.status === 'confirmed')

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '18px 16px 32px' }}>
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: 13, marginBottom: 14 }}>
        <ArrowLeft size={14} /> Home
      </Link>

      <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 4px' }}>Fuel</h1>
      <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 18px' }}>
        Photograph the plate. Correct what's wrong. The trend is the point, not the day.
      </p>

      <div style={{ marginBottom: 18 }}><FuelCapture /></div>

      {/* Today */}
      <section className="card2 rise rise-1" style={{ padding: 16, marginBottom: 14 }}>
        <div className="section-label" style={{ marginBottom: 10 }}>Today</div>
        {confirmed.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
            Nothing logged yet.
          </p>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 18, marginBottom: 12, flexWrap: 'wrap' }}>
              <Stat label="Calories" value={`≈ ${Math.round(todayRow.calories)}`} />
              <Stat label="Protein" value={`${Math.round(todayRow.protein_g)}g`} sub={`of ${PROTEIN_TARGET_G}g`} />
              <Stat label="Fibre" value={`${Math.round(todayRow.fiber_g)}g`} />
              <Stat label="Produce" value={`${todayRow.produce_servings}`} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {confirmed.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--foreground-2)' }}>
                  <span>{m.slot ?? 'Meal'} · {m.items.length} item{m.items.length === 1 ? '' : 's'}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>≈ {Math.round(m.calories)} kcal</span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Trends */}
      <section className="card2 rise rise-2" style={{ padding: 16, marginBottom: 14 }}>
        <div className="section-label" style={{ marginBottom: 12 }}>Trends · last 30 days</div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <Stat
            label="Weight (7-day avg)"
            value={weight.avg === null ? '--' : `${weight.avg} lb`}
            sub={weight.change === null ? `${weight.samples} weigh-in${weight.samples === 1 ? '' : 's'}` : `${weight.change > 0 ? '+' : ''}${weight.change} lb vs prior week`}
          />
          <Stat
            label="Protein target"
            value={protein.pct === null ? '--' : `${protein.pct}%`}
            sub={`${protein.hits} of ${protein.of} logged days`}
          />
          <Stat
            label="Training"
            value={training.asked ? `${training.done}/${training.asked}` : '--'}
            sub="sessions this week"
          />
        </div>
      </section>

      {/* Insights */}
      {insights.length > 0 && (
        <section className="card2 rise rise-3" style={{ padding: 16 }}>
          <div className="section-label" style={{ marginBottom: 10 }}>What the trend says</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {insights.map((i, n) => (
              <p key={n} style={{
                margin: 0, fontSize: 13, lineHeight: 1.55, paddingLeft: 10,
                borderLeft: `2px solid ${i.tone === 'good' ? 'var(--green)' : i.tone === 'watch' ? 'var(--yellow)' : 'var(--border-2)'}`,
                color: 'var(--foreground-2)',
              }}>{i.text}</p>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div className="stat-cap">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}
