import Link from 'next/link'
import { ArrowLeft, Flame, TrendingUp } from 'lucide-react'
import ProgressRing from '@/components/ui/ProgressRing'
import { getConsistencyTrend } from '@/lib/consistency'

export const dynamic = 'force-dynamic'

const scoreColor = (s: number) => s >= 80 ? 'var(--green)' : s >= 50 ? 'var(--money)' : s >= 25 ? 'var(--accent)' : 'var(--muted)'
const dayLabel = (d: string) => new Intl.DateTimeFormat('en-US', { weekday: 'narrow', timeZone: 'UTC' }).format(new Date(`${d}T12:00:00Z`))

export default async function ConsistencyPage() {
  const { today, series, streak } = await getConsistencyTrend(30)
  const last14 = series.slice(-14)
  const avg30 = series.length ? Math.round(series.reduce((a, s) => a + s.score, 0) / series.length) : 0

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '18px 16px 40px' }}>
      {/* Header */}
      <div className="rise rise-1" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link href="/dashboard" className="press" style={{ color: 'var(--foreground-2)' }}><ArrowLeft size={22} /></Link>
        <h1 className="h-hero" style={{ margin: 0, fontSize: 24 }}>Consistency</h1>
      </div>

      {/* Hero: today's unified score */}
      <div className="pcard glow rise rise-2" style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 14 }}>
        <ProgressRing pct={today.score} color={scoreColor(today.score)} size={116}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em' }}>{today.score}</div>
          <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.1em' }}>TODAY</div>
        </ProgressRing>
        <div style={{ flex: 1 }}>
          <div className="label" style={{ marginBottom: 8 }}>Overall Consistency</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
            <Flame size={16} color="var(--money)" />
            <span style={{ fontSize: 15, fontWeight: 700 }}>{streak} day{streak === 1 ? '' : 's'}</span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>streak</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <TrendingUp size={16} color="var(--green)" />
            <span style={{ fontSize: 15, fontWeight: 700 }}>{avg30}%</span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>30-day avg</span>
          </div>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="rise rise-3" style={{ margin: '20px 2px 12px' }}><span className="label">Today&apos;s Breakdown</span></div>
      <div className="pcard rise rise-3" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 16px' }}>
        {today.categories.map(c => (
          <div key={c.key}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>{c.label}</span>
              <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                {c.total > 0 ? <><span style={{ color: c.color, fontWeight: 700 }}>{c.done}</span> / {c.total} · {c.pct}%</> : 'none set'}
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 6, background: 'var(--surface-3)', overflow: 'hidden' }}>
              <div style={{ width: `${c.pct}%`, height: '100%', borderRadius: 6, background: c.color, transition: 'width .3s' }} />
            </div>
          </div>
        ))}
      </div>

      {/* 14-day trend */}
      <div className="rise rise-4" style={{ margin: '22px 2px 12px' }}><span className="label">Last 14 Days</span></div>
      <div className="pcard rise rise-4" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 4, height: 120, padding: '14px 12px 10px' }}>
        {last14.map(d => (
          <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
            <div title={`${d.date}: ${d.score}%`} style={{ width: '100%', maxWidth: 18, height: `${Math.max(4, d.score)}%`, borderRadius: 4, background: scoreColor(d.score), opacity: d.score ? 1 : 0.3 }} />
            <span style={{ fontSize: 9, color: 'var(--muted)' }}>{dayLabel(d.date)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
