// Season data access. The scoring itself is pure and lives in ./score, so it
// can be tested without a database.

import { supabase } from '../supabase'
import { addDays, daysBetween, emptyFacts, etToday, scoreDay, type DayFacts, type Season, type SeasonProgress, type TodayCard } from './score'

export * from './score'

const etDateOf = (ts: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date(ts))

/* ------------------------------------------------------------- the season */

export async function getActiveSeason(): Promise<Season | null> {
  const { data } = await supabase
    .from('seasons')
    .select('id,name,start_date,end_date,goal')
    .eq('active', true)
    .maybeSingle()
  return (data as Season) ?? null
}

/* --------------------------------------------------------------- scoring */

/** Fetch the raw facts for a date range in three queries, bucketed by ET date. */
async function factsForRange(from: string, to: string): Promise<Map<string, DayFacts>> {
  const [compRes, habitRes, habitDefs, postRes, mealRes] = await Promise.all([
    supabase.from('completions').select('ref_id,done_date').eq('ref_type', 'block').gte('done_date', from).lte('done_date', to),
    supabase.from('habit_logs').select('habit_id,log_date,value,done').gte('log_date', from).lte('log_date', to),
    supabase.from('habits').select('id,name'),
    supabase.from('content_posts').select('posted_at').not('posted_at', 'is', null).gte('posted_at', `${from}T00:00:00Z`),
    // Confirmed meals only — an estimate nobody reviewed is not evidence.
    supabase.from('meals').select('meal_date,protein_g').eq('status', 'confirmed').gte('meal_date', from).lte('meal_date', to),
  ])

  const habitName = new Map<string, string>((habitDefs.data ?? []).map((h: { id: string; name: string }) => [h.id, h.name]))
  const out = new Map<string, DayFacts>()
  const bucket = (d: string) => out.get(d) ?? out.set(d, emptyFacts()).get(d)!

  for (const c of compRes.data ?? []) bucket((c as { done_date: string }).done_date).blocks.add((c as { ref_id: string }).ref_id)
  for (const h of (habitRes.data ?? []) as { habit_id: string; log_date: string; value: number; done: boolean }[]) {
    const name = habitName.get(h.habit_id)
    if (!name) continue
    bucket(h.log_date).habits.set(name, { value: Number(h.value) || 0, done: !!h.done })
  }
  for (const m of (mealRes.data ?? []) as { meal_date: string; protein_g: number }[]) {
    bucket(m.meal_date).proteinG += Number(m.protein_g) || 0
  }
  for (const p of (postRes.data ?? []) as { posted_at: string }[]) {
    const d = etDateOf(p.posted_at)
    if (d >= from && d <= to) bucket(d).posts++
  }
  return out
}

/** Today's card. */
export async function getTodayCard(dateStr = etToday()): Promise<TodayCard> {
  const facts = await factsForRange(dateStr, dateStr)
  return scoreDay(dateStr, facts.get(dateStr) ?? emptyFacts())
}

/**
 * Season progress plus the consistency percentage.
 *
 * The percentage covers completed days only — season start through yesterday.
 * Including a half-finished today would show 14% at breakfast and say nothing
 * true; today is on the card above it, live.
 */
export async function getSeasonProgress(dateStr = etToday()): Promise<SeasonProgress> {
  const season = await getActiveSeason()
  if (!season) {
    return { season: null, dayNumber: 0, totalDays: 0, notStarted: false, daysUntilStart: 0, consistencyPct: null, scoredDays: 0, series: [] }
  }

  const totalDays = daysBetween(season.start_date, season.end_date) + 1
  const elapsed = daysBetween(season.start_date, dateStr) // 0 on day one
  const notStarted = elapsed < 0
  const dayNumber = notStarted ? 0 : Math.min(elapsed + 1, totalDays)

  // Completed days: season start → yesterday, clamped to the season.
  const lastScored = addDays(dateStr, -1)
  const scoredFrom = season.start_date
  const scoredTo = lastScored < season.end_date ? lastScored : season.end_date

  if (notStarted || scoredTo < scoredFrom) {
    return {
      season, dayNumber, totalDays, notStarted,
      daysUntilStart: notStarted ? -elapsed : 0,
      consistencyPct: null, scoredDays: 0, series: [],
    }
  }

  const facts = await factsForRange(scoredFrom, scoredTo)
  const n = daysBetween(scoredFrom, scoredTo) + 1
  const series = Array.from({ length: n }, (_, i) => {
    const d = addDays(scoredFrom, i)
    return { date: d, pct: scoreDay(d, facts.get(d) ?? emptyFacts()).pct }
  })

  const consistencyPct = series.length
    ? Math.round(series.reduce((s, d) => s + d.pct, 0) / series.length)
    : null

  return { season, dayNumber, totalDays, notStarted, daysUntilStart: 0, consistencyPct, scoredDays: series.length, series }
}
