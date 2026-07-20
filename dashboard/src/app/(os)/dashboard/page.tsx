import { supabase } from '@/lib/supabase'
import { getRevenueSnapshot } from '@/lib/ledger'
import { getTodaySchedule, fmtClock, PILLAR_COLORS } from '@/lib/schedule'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

const money = (n: number) => '$' + Math.round(n).toLocaleString()

function etHourNow(): number {
  return Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/New_York' }).format(new Date())) % 24
}

// Journal-based consistency over the last 7 days + current streak.
async function getConsistency(): Promise<{ pct: number; streak: number }> {
  const today = new Date()
  const dayStr = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(d)
  const start = new Date(today.getTime() - 7 * 86400000)
  const { data } = await supabase.from('journal').select('entry_date').gte('entry_date', dayStr(start))
  const days = new Set((data ?? []).map((r: any) => r.entry_date))
  const last7 = Array.from({ length: 7 }, (_, i) => dayStr(new Date(today.getTime() - i * 86400000)))
  const hit = last7.filter(d => days.has(d)).length
  let streak = 0
  for (let i = 0; i < 60; i++) { if (days.has(dayStr(new Date(today.getTime() - i * 86400000)))) streak++; else if (i > 0) break }
  return { pct: Math.round((hit / 7) * 100), streak }
}

export default async function Home() {
  const h = etHourNow()
  const greeting = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'

  const [sched, consistency, { count: taskCount }, rev, { data: cfg }] = await Promise.all([
    getTodaySchedule(),
    getConsistency(),
    supabase.from('tasks').select('id', { count: 'exact', head: true }).in('status', ['pending', 'in_progress']),
    getRevenueSnapshot().catch(() => null),
    supabase.from('kalebos_config').select('value').eq('key', 'north_star').maybeSingle(),
  ])

  const focus = cfg?.value || 'Become the man capable of creating everything else.'
  // Forward-looking: current block + what's still ahead today.
  const upcoming = sched.blocks.filter(b => b.end_min > sched.nowMin).slice(0, 7)

  return (
    <div className="page-pad" style={{ maxWidth: 760, margin: '0 auto' }}>
      {/* Greeting */}
      <h1 style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-0.02em', margin: '2px 0 8px' }}>{greeting}, Kaleb 👋</h1>
      <p style={{ color: 'var(--foreground-2)', fontSize: 13.5, lineHeight: 1.55, margin: '0 0 20px' }}>
        Protect the morning. Build in the afternoon. Share in the evening. Reflect before sleep.
      </p>

      {/* Today's Focus */}
      <div className="card2" style={{ marginBottom: 14 }}>
        <div className="section-label" style={{ marginBottom: 8 }}>Today&apos;s Focus</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.4 }}>{focus}</div>
      </div>

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
        <div className="stat-tile">
          <div className="stat-num" style={{ color: 'var(--accent)' }}>{consistency.pct}%</div>
          <div className="stat-cap">Consistency</div>
          <div className="stat-sub">{consistency.streak} day streak</div>
        </div>
        <div className="stat-tile">
          <div className="stat-num" style={{ color: 'var(--foreground)' }}>{taskCount ?? 0}</div>
          <div className="stat-cap">Tasks</div>
          <div className="stat-sub">Today</div>
        </div>
        <div className="stat-tile">
          <div className="stat-num" style={{ color: 'var(--green)' }}>{rev ? money(rev.thisMonth) : '—'}</div>
          <div className="stat-cap">Cash In</div>
          <div className="stat-sub">This month</div>
        </div>
      </div>

      {/* Today's Schedule */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span className="section-label">Today&apos;s Schedule</span>
        <Link href="/schedule" style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
          Full day <ChevronRight size={13} />
        </Link>
      </div>

      {upcoming.length === 0 ? (
        <div className="card2" style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Day complete — rest well.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {upcoming.map(b => {
            const color = PILLAR_COLORS[b.pillar] ?? 'var(--muted)'
            const isNow = sched.current?.id === b.id
            return (
              <Link key={b.id} href="/schedule" style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px',
                background: isNow ? 'var(--accent-dim)' : 'var(--surface)',
                border: `1px solid ${isNow ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 14,
              }}>
                <div className="tl-bar" style={{ background: color, minHeight: 34 }} />
                <div style={{ minWidth: 62, fontSize: 12, fontWeight: 700, color: isNow ? 'var(--accent)' : 'var(--foreground-2)' }}>{fmtClock(b.start_min)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>{b.title}{b.theme ? <span style={{ color, fontWeight: 600 }}> · {b.theme}</span> : null}</div>
                  {b.detail && <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.detail}</div>}
                </div>
                <span className="pillar-tag" style={{ color, background: `${color}1f` }}>{b.pillar}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
