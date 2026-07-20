import { supabase } from '@/lib/supabase'
import { getRevenueSnapshot } from '@/lib/ledger'
import { getTodaySchedule, fmtClock, PILLAR_COLORS } from '@/lib/schedule'
import { blockIcon } from '@/lib/blockIcon'
import Sparkline from '@/components/ui/Sparkline'
import ProgressRing from '@/components/ui/ProgressRing'
import Link from 'next/link'
import { Menu, Target, ChevronRight, Zap } from 'lucide-react'

export const dynamic = 'force-dynamic'

const money = (n: number) => '$' + Math.round(n).toLocaleString()
const etHour = () => Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/New_York' }).format(new Date())) % 24
const dayKey = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(d)

async function getMomentum(): Promise<{ pct: number; streak: number; series: number[] }> {
  const today = new Date()
  const { data } = await supabase.from('journal').select('entry_date').gte('entry_date', dayKey(new Date(today.getTime() - 13 * 86400000)))
  const days = new Set((data ?? []).map((r: any) => r.entry_date))
  const last7 = Array.from({ length: 7 }, (_, i) => dayKey(new Date(today.getTime() - i * 86400000)))
  const pct = Math.round((last7.filter(d => days.has(d)).length / 7) * 100)
  let streak = 0
  for (let i = 0; i < 90; i++) { if (days.has(dayKey(new Date(today.getTime() - i * 86400000)))) streak++; else if (i > 0) break }
  // 14-day cumulative entries → smooth upward momentum line.
  let cum = 0
  const series = Array.from({ length: 14 }, (_, i) => { if (days.has(dayKey(new Date(today.getTime() - (13 - i) * 86400000)))) cum++; return cum })
  return { pct, streak, series }
}

export default async function Home() {
  const h = etHour()
  const greeting = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'

  const [s, mom, { count: taskCount }, { data: tasks }, rev, { data: cfg }] = await Promise.all([
    getTodaySchedule(),
    getMomentum(),
    supabase.from('tasks').select('id', { count: 'exact', head: true }).in('status', ['pending', 'in_progress']),
    supabase.from('tasks').select('title').in('status', ['pending', 'in_progress']).order('priority', { ascending: false }).limit(3),
    getRevenueSnapshot().catch(() => null),
    supabase.from('kalebos_config').select('key,value').in('key', ['north_star', 'daily_reminder']),
  ])
  const conf = Object.fromEntries((cfg ?? []).map((r: any) => [r.key, r.value]))
  const focus = conf.north_star || 'Become the man capable of creating everything else.'
  const reminder = conf.daily_reminder || 'Discipline today = freedom tomorrow.'

  const cur = s.current
  const curColor = cur ? (PILLAR_COLORS[cur.pillar] ?? 'var(--accent)') : 'var(--accent)'
  const remainMin = cur ? cur.end_min - s.nowMin : 0
  const elapsedPct = cur ? ((s.nowMin - cur.start_min) / (cur.end_min - cur.start_min)) * 100 : 0
  const remainLabel = remainMin >= 60 ? `${Math.floor(remainMin / 60)}h ${remainMin % 60}m` : `${remainMin}m`
  const CurIcon = cur ? blockIcon(cur.title) : Target
  const nxt = s.next
  const NxtIcon = nxt ? blockIcon(nxt.title) : Target
  const nxtColor = nxt ? (PILLAR_COLORS[nxt.pillar] ?? 'var(--muted)') : 'var(--muted)'

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '18px 16px 32px' }}>
      {/* Header */}
      <div className="rise rise-1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <Link href="/apps" className="press" style={{ color: 'var(--foreground-2)' }}><Menu size={22} /></Link>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 16 }}>K</div>
      </div>

      <div className="rise rise-1" style={{ marginBottom: 22 }}>
        <h1 className="h-hero" style={{ margin: 0 }}>{greeting}, <span style={{ color: 'var(--accent)' }}>Kaleb</span>. 👑</h1>
        <p style={{ color: 'var(--foreground-2)', fontSize: 14, lineHeight: 1.5, margin: '8px 0 0' }}>Protect the morning. Build your empire.</p>
      </div>

      {/* Current block — the operating timeline centerpiece */}
      {cur ? (
        <div className="pcard glow rise rise-2" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="label" style={{ marginBottom: 10 }}>Current Block</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span className="grad-icon breathe" style={{ width: 34, height: 34, background: `${curColor}22`, borderRadius: 11 }}><CurIcon size={18} color={curColor} /></span>
              <span className="h-title" style={{ color: 'var(--foreground)' }}>{cur.title}</span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{fmtClock(cur.start_min)} – {fmtClock(cur.end_min)}</div>
            {cur.detail && <div style={{ fontSize: 12.5, color: 'var(--foreground-2)', marginTop: 6, lineHeight: 1.4 }}>{cur.detail}</div>}
          </div>
          <ProgressRing pct={elapsedPct} color={curColor} size={104}>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--foreground)' }}>{remainLabel}</div>
            <div style={{ fontSize: 9.5, color: 'var(--muted)', letterSpacing: '0.08em' }}>REMAINING</div>
          </ProgressRing>
        </div>
      ) : (
        <div className="pcard rise rise-2" style={{ marginBottom: 12 }}>
          <div className="label" style={{ marginBottom: 8 }}>Open Window</div>
          <div style={{ fontSize: 15, color: 'var(--foreground-2)' }}>Between blocks — breathe, or get ahead.</div>
        </div>
      )}

      {/* Up next */}
      {nxt && (
        <Link href="/schedule" className="pcard press rise rise-3" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span className="grad-icon" style={{ width: 38, height: 38, background: `${nxtColor}1c`, borderRadius: 12 }}><NxtIcon size={19} color={nxtColor} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="label" style={{ marginBottom: 4 }}>Up Next</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>{nxt.title}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{fmtClock(nxt.start_min)} – {fmtClock(nxt.end_min)}</div>
          </div>
          <ChevronRight size={18} color="var(--muted)" />
        </Link>
      )}

      {/* Today's focus */}
      <div className="pcard rise rise-4" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <Target size={13} color="var(--accent)" /><span className="label">Today&apos;s Focus</span>
        </div>
        <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.4, letterSpacing: '-0.01em' }}>{focus}</div>
      </div>

      {/* Stat tiles */}
      <div className="rise rise-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        <div className="stat-tile" style={{ padding: '14px 14px 10px' }}>
          <div className="stat-num" style={{ color: 'var(--green)' }}>{mom.pct}%</div>
          <div className="stat-cap">Consistency</div>
          <div style={{ marginTop: 8, marginLeft: -2 }}><Sparkline data={mom.series} color="var(--green)" width={90} height={26} /></div>
        </div>
        <div className="stat-tile" style={{ padding: '14px' }}>
          <div className="stat-num">{taskCount ?? 0}</div>
          <div className="stat-cap">Tasks</div>
          <div className="stat-sub">Today</div>
        </div>
        <div className="stat-tile" style={{ padding: '14px' }}>
          <div className="stat-num" style={{ color: 'var(--green)' }}>{rev ? money(rev.thisMonth) : '—'}</div>
          <div className="stat-cap">Cash In</div>
          <div className="stat-sub">This month</div>
        </div>
      </div>

      {/* Priorities */}
      {(tasks ?? []).length > 0 && (
        <div className="rise rise-5" style={{ marginBottom: 20 }}>
          <div className="label" style={{ margin: '0 4px 10px' }}>Priorities</div>
          <div className="pcard" style={{ padding: '6px 8px' }}>
            {(tasks ?? []).map((t: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 10px', borderBottom: i < (tasks ?? []).length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--foreground-2)', flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontSize: 14, color: 'var(--foreground)' }}>{t.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily reminder */}
      <div className="pcard rise rise-6" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1 }}>
          <div className="label" style={{ marginBottom: 6 }}>Daily Reminder</div>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.4 }}>{reminder}</div>
        </div>
        <Zap size={20} color="var(--money)" fill="var(--money)" />
      </div>
    </div>
  )
}
