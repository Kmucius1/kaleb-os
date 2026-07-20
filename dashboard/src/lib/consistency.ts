import { supabase } from './supabase'
import { dayTypeOf, dowOfDateStr } from './schedule'

// The unified "did I actually run my life today?" score. It rolls up every kind
// of progress the app tracks — schedule check-offs, habits, journaling — into a
// single 0–100 KPI, plus a per-category breakdown and a trend for the graph.

export const etToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())
const asDate = (s: string) => new Date(`${s}T12:00:00Z`)
const iso = (d: Date) => d.toISOString().slice(0, 10)
export function daysAgo(dateStr: string, n: number) { const d = asDate(dateStr); d.setUTCDate(d.getUTCDate() - n); return iso(d) }
const etDateOf = (ts: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date(ts))

export type Category = { key: string; label: string; color: string; pct: number; done: number; total: number; weight: number }
export type DayConsistency = { date: string; score: number; categories: Category[] }

// Raw per-day tallies, fetched once over a range then bucketed by date.
type DayData = { blocksDone: number; habitsDone: number; journaled: boolean }

function computeDay(dateStr: string, d: DayData, activeHabits: number, blockCounts: Record<string, number>): DayConsistency {
  const blockTotal = blockCounts[dayTypeOf(dowOfDateStr(dateStr))] || 0
  const cats: Category[] = [
    { key: 'schedule', label: 'Schedule', color: '#6366f1', done: d.blocksDone, total: blockTotal, weight: 3, pct: blockTotal ? Math.round((d.blocksDone / blockTotal) * 100) : 0 },
    { key: 'habits', label: 'Habits', color: '#34d399', done: d.habitsDone, total: activeHabits, weight: 2, pct: activeHabits ? Math.round((d.habitsDone / activeHabits) * 100) : 0 },
    { key: 'journal', label: 'Journal', color: '#a855f7', done: d.journaled ? 1 : 0, total: 1, weight: 1, pct: d.journaled ? 100 : 0 },
  ]
  const active = cats.filter(c => c.total > 0)
  const wSum = active.reduce((a, c) => a + c.weight, 0)
  const score = wSum ? Math.round(active.reduce((a, c) => a + c.pct * c.weight, 0) / wSum) : 0
  return { date: dateStr, score, categories: cats }
}

async function commonRefs() {
  const [{ count: activeHabits }, blocksRes] = await Promise.all([
    supabase.from('habits').select('id', { count: 'exact', head: true }).eq('active', true),
    supabase.from('schedule_blocks').select('day_type'),
  ])
  const blockCounts: Record<string, number> = { weekday: 0, saturday: 0, sunday: 0 }
  for (const r of blocksRes.data ?? []) blockCounts[(r as any).day_type] = (blockCounts[(r as any).day_type] ?? 0) + 1
  return { activeHabits: activeHabits ?? 0, blockCounts }
}

// Trend of daily scores for the last `n` days (oldest → newest), plus today's
// full breakdown and the current streak (consecutive days scoring ≥ threshold).
export async function getConsistencyTrend(n = 14, streakThreshold = 60): Promise<{
  today: DayConsistency; series: { date: string; score: number }[]; streak: number
}> {
  const today = etToday()
  const from = daysAgo(today, n - 1)
  const { activeHabits, blockCounts } = await commonRefs()

  const [compRes, habitRes, jrnlRes] = await Promise.all([
    supabase.from('completions').select('done_date').eq('ref_type', 'block').gte('done_date', from),
    supabase.from('habit_logs').select('log_date,done').eq('done', true).gte('log_date', from),
    supabase.from('journal').select('created_at').gte('created_at', `${from}T00:00:00Z`),
  ])

  const data = new Map<string, DayData>()
  const bucket = (d: string) => data.get(d) ?? data.set(d, { blocksDone: 0, habitsDone: 0, journaled: false }).get(d)!
  for (const c of compRes.data ?? []) bucket((c as any).done_date).blocksDone++
  for (const h of habitRes.data ?? []) bucket((h as any).log_date).habitsDone++
  for (const j of jrnlRes.data ?? []) bucket(etDateOf((j as any).created_at)).journaled = true

  const dates = Array.from({ length: n }, (_, i) => daysAgo(today, n - 1 - i))
  const days = dates.map(d => computeDay(d, data.get(d) ?? { blocksDone: 0, habitsDone: 0, journaled: false }, activeHabits, blockCounts))

  // Streak: walk backward from today while score ≥ threshold.
  let streak = 0
  for (let i = days.length - 1; i >= 0; i--) { if (days[i].score >= streakThreshold) streak++; else break }

  return { today: days[days.length - 1], series: days.map(d => ({ date: d.date, score: d.score })), streak }
}

// Just today's score + breakdown (used by the home tile).
export async function getTodayConsistency(): Promise<DayConsistency> {
  const { today } = await getConsistencyTrend(1)
  return today
}
