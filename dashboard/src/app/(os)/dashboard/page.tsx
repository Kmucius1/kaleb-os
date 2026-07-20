import { supabase } from '@/lib/supabase'
import { getRevenueSnapshot } from '@/lib/ledger'
import { getTodaySchedule } from '@/lib/schedule'
import { getConsistencyTrend } from '@/lib/consistency'
import Sparkline from '@/components/ui/Sparkline'
import LiveTimeline from '@/components/LiveTimeline'
import Link from 'next/link'
import { Menu, Target, Zap } from 'lucide-react'

export const dynamic = 'force-dynamic'

const money = (n: number) => '$' + Math.round(n).toLocaleString()
const etHour = () => Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/New_York' }).format(new Date())) % 24

export default async function Home() {
  const h = etHour()
  const greeting = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'

  const [s, mom, { count: taskCount }, { data: tasks }, rev, { data: cfg }] = await Promise.all([
    getTodaySchedule(),
    getConsistencyTrend(14),
    supabase.from('tasks').select('id', { count: 'exact', head: true }).in('status', ['pending', 'in_progress']),
    supabase.from('tasks').select('title').in('status', ['pending', 'in_progress']).order('priority', { ascending: false }).limit(3),
    getRevenueSnapshot().catch(() => null),
    supabase.from('kalebos_config').select('key,value').in('key', ['north_star', 'daily_reminder']),
  ])
  const conf = Object.fromEntries((cfg ?? []).map((r: any) => [r.key, r.value]))
  const focus = conf.north_star || 'Become the man capable of creating everything else.'
  const reminder = conf.daily_reminder || 'Discipline today = freedom tomorrow.'

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

      {/* Current block + Up Next — live, ticks every second (client) */}
      <LiveTimeline initialBlocks={s.blocks} />

      {/* Today's focus */}
      <div className="pcard rise rise-4" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <Target size={13} color="var(--accent)" /><span className="label">Today&apos;s Focus</span>
        </div>
        <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.4, letterSpacing: '-0.01em' }}>{focus}</div>
      </div>

      {/* Stat tiles */}
      <div className="rise rise-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        <Link href="/consistency" className="stat-tile press" style={{ padding: '14px 14px 10px', textDecoration: 'none' }}>
          <div className="stat-num" style={{ color: 'var(--green)' }}>{mom.today.score}%</div>
          <div className="stat-cap">Consistency</div>
          <div style={{ marginTop: 8, marginLeft: -2 }}><Sparkline data={mom.series.map(p => p.score)} color="var(--green)" width={90} height={26} /></div>
        </Link>
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
