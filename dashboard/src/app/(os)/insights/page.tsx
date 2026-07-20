import { supabase } from '@/lib/supabase'
import Sparkline from '@/components/ui/Sparkline'
import MiniBars from '@/components/ui/MiniBars'
import { ArrowUp, ArrowDown } from 'lucide-react'

export const dynamic = 'force-dynamic'

const dayKey = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(d)

export default async function InsightsPage() {
  const now = new Date()
  const days7 = Array.from({ length: 7 }, (_, i) => dayKey(new Date(now.getTime() - (6 - i) * 86400000)))
  const d14 = dayKey(new Date(now.getTime() - 13 * 86400000))
  const since7 = new Date(now.getTime() - 7 * 86400000).toISOString()

  const [journalRes, tradesRes, moodRes, habitRes, habitCountRes] = await Promise.all([
    supabase.from('journal').select('entry_date').gte('entry_date', d14),
    supabase.from('trades').select('pnl,created_at').gte('created_at', since7).then(r => r, () => ({ data: [] as any[] })),
    supabase.from('mood_checkins').select('score,created_at').gte('created_at', since7).then(r => r, () => ({ data: [] as any[] })),
    supabase.from('habit_logs').select('done,log_date').gte('log_date', days7[0]).then(r => r, () => ({ data: [] as any[] })),
    supabase.from('habits').select('id', { count: 'exact', head: true }).eq('active', true).then(r => r, () => ({ count: 0 })),
  ])

  // Consistency (journal)
  const jdays = new Set((journalRes.data ?? []).map((r: any) => r.entry_date))
  const thisWeek = days7.filter(d => jdays.has(d)).length
  const prevWeek = Array.from({ length: 7 }, (_, i) => dayKey(new Date(now.getTime() - (13 - i) * 86400000))).filter(d => jdays.has(d)).length
  const consistency = Math.round((thisWeek / 7) * 100)
  const consDelta = thisWeek - prevWeek
  let cum = 0
  const consSeries = Array.from({ length: 14 }, (_, i) => { if (jdays.has(dayKey(new Date(now.getTime() - (13 - i) * 86400000)))) cum++; return cum })

  // Trading (real trades this week)
  const trades = tradesRes.data ?? []
  const pnlByDay = days7.map(d => trades.filter((t: any) => dayKey(new Date(t.created_at)) === d).reduce((s: number, t: any) => s + (Number(t.pnl) || 0), 0))
  const totalPnl = trades.reduce((s: number, t: any) => s + (Number(t.pnl) || 0), 0)

  // Energy (mood 1-5 → /10)
  const moods = moodRes.data ?? []
  const moodByDay = days7.map(d => {
    const dm = moods.filter((m: any) => dayKey(new Date(m.created_at)) === d).map((m: any) => Number(m.score) || 0)
    return dm.length ? dm.reduce((a: number, b: number) => a + b, 0) / dm.length : 0
  })
  const moodVals = moods.map((m: any) => Number(m.score) || 0)
  const energy = moodVals.length ? (moodVals.reduce((a: number, b: number) => a + b, 0) / moodVals.length) * 2 : 0

  // Habits completion this week
  const habitLogs = habitRes.data ?? []
  const habitTotal = habitCountRes.count ?? 0
  const habitByDay = days7.map(d => habitLogs.filter((l: any) => l.log_date === d && l.done).length)
  const habitPct = habitTotal ? Math.round((habitLogs.filter((l: any) => l.done).length / (habitTotal * 7)) * 100) : 0

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '18px 16px 40px' }}>
      <h1 className="h-hero rise rise-1" style={{ margin: '0 0 16px', fontSize: 24 }}>Insights</h1>

      <div className="seg rise rise-1" style={{ marginBottom: 18 }}>
        <span className="seg-item active">Week</span>
        <span className="seg-item">Month</span>
        <span className="seg-item">Year</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <MetricCard i={2} label="Consistency Score" value={`${consistency}%`} color="var(--accent)"
          delta={consDelta} deltaLabel="vs last week" unit="d">
          <Sparkline data={consSeries} color="var(--accent)" width={470} height={54} />
        </MetricCard>

        <MetricCard i={3} label="Trading P&L · This Week" value={(totalPnl >= 0 ? '+' : '') + '$' + Math.round(totalPnl).toLocaleString()}
          color={totalPnl >= 0 ? 'var(--green)' : 'var(--red)'} sub={`${trades.length} trade${trades.length === 1 ? '' : 's'}`}
          empty={trades.length === 0 ? 'No trades logged this week' : undefined}>
          <MiniBars data={pnlByDay} color="var(--green)" width={470} height={54} />
        </MetricCard>

        <MetricCard i={4} label="Energy Level" value={energy ? `${energy.toFixed(1)} / 10` : '—'} color="var(--blue)"
          empty={moodVals.length === 0 ? 'Log how you feel to track energy' : undefined}>
          <Sparkline data={moodByDay.map(v => v || 0)} color="var(--blue)" width={470} height={54} />
        </MetricCard>

        <MetricCard i={5} label="Habits" value={`${habitPct}%`} color="var(--green)" sub="completed this week"
          empty={habitTotal === 0 ? 'No habits yet' : undefined}>
          <MiniBars data={habitByDay} color="var(--green)" width={470} height={54} />
        </MetricCard>
      </div>
    </div>
  )
}

function MetricCard({ i, label, value, color, sub, delta, deltaLabel, unit, empty, children }: {
  i: number; label: string; value: string; color: string; sub?: string
  delta?: number; deltaLabel?: string; unit?: string; empty?: string; children: React.ReactNode
}) {
  return (
    <div className={`pcard rise rise-${i}`} style={{ padding: 18 }}>
      <div className="label" style={{ marginBottom: 12 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
        <span className="stat-num" style={{ color, fontSize: 30 }}>{value}</span>
        {typeof delta === 'number' && delta !== 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 12, fontWeight: 700, color: delta > 0 ? 'var(--green)' : 'var(--red)' }}>
            {delta > 0 ? <ArrowUp size={13} /> : <ArrowDown size={13} />}{Math.abs(delta)}{unit} {deltaLabel}
          </span>
        )}
        {sub && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{sub}</span>}
      </div>
      {empty ? (
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 10 }}>{empty}</div>
      ) : (
        <div style={{ marginTop: 12, overflowX: 'auto' }}>{children}</div>
      )}
    </div>
  )
}
