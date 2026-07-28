'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Sunrise, Sunset, Waves } from 'lucide-react'
import { fmtMin } from '@/lib/rhythm/engine'

// The Horizon Walk: the beach every day, five of seven as the floor, seven as
// the aim — and four is progress, not failure. The copy here is deliberate.

type Week = {
  done: number; of: number; daysLeft: number; minimum: number; ideal: number
  metMinimum: boolean; minimumImpossible: boolean; atRisk: boolean; mustHit: number
}

export default function HorizonCard({ window: win, start, leaveAt, why, doneToday, week, estimated }: {
  window: 'sunrise' | 'sunset'
  start: number
  leaveAt: number
  why: string
  doneToday: boolean
  week: Week
  estimated?: boolean
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const Icon = win === 'sunrise' ? Sunrise : Sunset
  const accent = win === 'sunrise' ? 'var(--money)' : 'var(--spirit)'

  async function checkIn() {
    setSaving(true)
    try {
      await fetch('/api/rhythm/horizon', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: !doneToday, window: win, method: 'manual' }),
      })
      router.refresh()
    } finally { setSaving(false) }
  }

  const status = week.metMinimum
    ? `${week.done} of 7 this week — floor cleared, ${week.ideal - week.done > 0 ? `${week.ideal - week.done} to go for the full seven` : 'a perfect week'}.`
    : week.minimumImpossible
      ? `${week.done} of 7 this week. Five isn't reachable now — take the days you have.`
      : week.atRisk
        ? `${week.done} of 7. Every one of the ${week.daysLeft} days left needs to count to hold the five.`
        : `${week.done} of 7 — ${week.mustHit} more clears your five.`

  return (
    <section className="pcard rise rise-5" style={{ marginBottom: 20 }} aria-label="Horizon Walk">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span className="grad-icon" style={{ width: 36, height: 36, background: `color-mix(in srgb, ${accent} 16%, transparent)`, borderRadius: 12, flexShrink: 0 }}>
          <Icon size={19} color={accent} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Horizon Walk</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'capitalize' }}>
            {win} · {fmtMin(start)}{estimated ? ' (estimated)' : ''}
          </div>
        </div>
        <button
          onClick={checkIn}
          disabled={saving}
          className="press"
          aria-label={doneToday ? 'Undo Horizon Walk check-in' : 'Mark Horizon Walk complete'}
          style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: doneToday ? 'var(--green)' : 'transparent',
            border: doneToday ? 'none' : '1.6px solid var(--border-2)',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {doneToday ? <Check size={20} color="#07100c" strokeWidth={3} /> : <Waves size={18} color="var(--muted)" />}
        </button>
      </div>

      <p style={{ fontSize: 12.5, color: 'var(--foreground-2)', margin: '0 0 12px', lineHeight: 1.45 }}>
        {doneToday ? 'Logged for today. That’s the one that matters.' : why}
      </p>

      {!doneToday && (
        <div style={{ fontSize: 12, color: 'var(--foreground-2)', marginBottom: 12 }}>
          Leave by <strong style={{ color: 'var(--foreground)' }}>{fmtMin(leaveAt)}</strong>
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }} aria-hidden>
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} style={{
            flex: 1, height: 6, borderRadius: 3,
            background: i < week.done ? accent : i < week.minimum ? 'var(--surface-3)' : 'var(--surface-2)',
            outline: i === week.minimum - 1 ? `1px solid color-mix(in srgb, ${accent} 45%, transparent)` : 'none',
          }} />
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{status}</div>
    </section>
  )
}
