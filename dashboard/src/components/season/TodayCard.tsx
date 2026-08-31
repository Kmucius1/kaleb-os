'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { pillarColor } from '@/lib/rhythm/pillars'
import type { TodayCard as Card, SeasonProgress } from '@/lib/season/score'

// The seven things a day is measured by, and the season number underneath.
//
// Everything here is one tap. The whole point of the 90-day system is that the
// behaviours become automatic, and a checklist you have to navigate to is a
// checklist you stop using — so this sits at the top of Home and writes
// straight through.

type Props = { initial: Card; season: SeasonProgress }

export default function TodayCard({ initial, season }: Props) {
  const router = useRouter()
  const [card, setCard] = useState(initial)
  const [busy, setBusy] = useState<string | null>(null)

  async function toggle(rowKey: string, unit: number, next: boolean) {
    const id = `${rowKey}:${unit}`
    if (busy) return
    setBusy(id)
    // Optimistic: the tap should feel instant even on a slow connection.
    setCard(c => ({
      ...c,
      rows: c.rows.map(r => (r.key === rowKey ? { ...r, done: next ? unit + 1 : unit } : r)),
    }))
    try {
      const res = await fetch('/api/season/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ row: rowKey, unit, done: next }),
      })
      const json = await res.json()
      if (json?.card) setCard(json.card)
      else setCard(initial)
      router.refresh()
    } catch {
      setCard(initial)
    } finally {
      setBusy(null)
    }
  }

  const pct = card.pct
  const dayLabel = season.notStarted
    ? `Starts in ${season.daysUntilStart} day${season.daysUntilStart === 1 ? '' : 's'}`
    : season.season
      ? `Day ${season.dayNumber} of ${season.totalDays}`
      : null

  return (
    <section className="card2 rise rise-1" style={{ padding: 18, marginBottom: 16 }}>
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <span className="section-label" style={{ letterSpacing: '0.14em' }}>Today</span>
        {dayLabel && (
          <span style={{ fontSize: 11, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{dayLabel}</span>
        )}
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {card.rows.map(row => (
          <div
            key={row.key}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, padding: '9px 0', borderBottom: '1px solid var(--border)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
              <i aria-hidden style={{
                width: 3, height: 16, borderRadius: 2, flexShrink: 0,
                background: pillarColor(row.pillar),
                opacity: row.rest ? 0.3 : row.done >= row.target ? 1 : 0.45,
              }} />
              <span style={{
                fontSize: 14, fontWeight: 500,
                color: row.rest ? 'var(--muted)' : 'var(--foreground)',
              }}>{row.label}</span>
            </span>

            {row.rest ? (
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                color: 'var(--muted)', textTransform: 'uppercase',
              }}>Rest</span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                {row.target > 1 && (
                  <span style={{ fontSize: 12, color: 'var(--foreground-2)', fontVariantNumeric: 'tabular-nums' }}>
                    {row.done}/{row.target}
                  </span>
                )}
                {Array.from({ length: row.target }, (_, i) => {
                  const filled = i < row.done
                  const id = `${row.key}:${i}`
                  return (
                    <button
                      key={i}
                      onClick={() => toggle(row.key, i, !filled)}
                      disabled={busy !== null}
                      aria-label={`${row.label}${row.target > 1 ? ` ${i + 1} of ${row.target}` : ''} — ${filled ? 'done, tap to undo' : 'not done, tap to complete'}`}
                      aria-pressed={filled}
                      style={{
                        width: 22, height: 22, borderRadius: '50%', padding: 0, cursor: 'pointer',
                        border: `1.5px solid ${filled ? pillarColor(row.pillar) : 'var(--border-2)'}`,
                        background: filled ? pillarColor(row.pillar) : 'transparent',
                        opacity: busy === id ? 0.5 : 1,
                        transition: 'background 120ms ease, border-color 120ms ease',
                      }}
                    />
                  )
                })}
              </span>
            )}
          </div>
        ))}
      </div>

      <footer style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginTop: 16 }}>
        <div style={{ minWidth: 0 }}>
          <div className="section-label" style={{ marginBottom: 2 }}>
            {season.totalDays ? `${season.totalDays}-Day Consistency` : 'Consistency'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            {season.notStarted
              ? season.season
                ? `${season.season.name} begins ${fmtDate(season.season.start_date)}`
                : 'No season running'
              : season.consistencyPct === null
                ? 'Scores from tomorrow — today is still open'
                : `Through yesterday · ${season.scoredDays} day${season.scoredDays === 1 ? '' : 's'}`}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontSize: 30, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em',
            fontVariantNumeric: 'tabular-nums',
            color: season.consistencyPct === null ? 'var(--muted)' : 'var(--foreground)',
            opacity: season.consistencyPct === null ? 0.55 : 1,
          }}>
            {season.consistencyPct === null ? '--%' : `${season.consistencyPct}%`}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
            today {card.done}/{card.total} · {pct}%
          </div>
        </div>
      </footer>
    </section>
  )
}

function fmtDate(d: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${d}T12:00:00Z`))
}
