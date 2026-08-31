// The 90-day season, and the seven things a day is measured by.
//
// "Optimize for consistency rather than perfection."
//
// The Today card is the atomic unit: seven rows, each either done or not.
// Season consistency is simply the mean of those daily fractions — so the
// number on the dashboard and the checklist under it are the same system,
// and a good day is legible without arithmetic.
//
// Rest days matter here. On Wednesday and Sunday the rhythm generates no gym
// block at all, so the Workout row renders REST and leaves the denominator
// with the day. A rest day can score 100%.

import { templateForDate } from '../rhythm/template'
import type { Pillar } from '../rhythm/pillars'

export const etToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())

const asDate = (s: string) => new Date(`${s}T12:00:00Z`)
const iso = (d: Date) => d.toISOString().slice(0, 10)
export const addDays = (dateStr: string, n: number) => {
  const d = asDate(dateStr)
  d.setUTCDate(d.getUTCDate() + n)
  return iso(d)
}
/** Whole days from `a` to `b` (negative when b is earlier). */
export const daysBetween = (a: string, b: string) =>
  Math.round((asDate(b).getTime() - asDate(a).getTime()) / 86_400_000)

const etDateOf = (ts: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date(ts))

/* ------------------------------------------------------------------ types */

export type Season = {
  id: string
  name: string
  start_date: string
  end_date: string
  goal: string | null
}

export type TodayRow = {
  key: string
  label: string
  /** How many of `target` are done today. */
  done: number
  target: number
  /** True on a scheduled rest day — renders REST and is excluded from scoring. */
  rest?: boolean
  pillar: Pillar
}

export type TodayCard = {
  date: string
  rows: TodayRow[]
  done: number
  total: number
  /** 0–100. Rest rows are excluded from both sides. */
  pct: number
}

export type SeasonProgress = {
  season: Season | null
  /** 1-based day within the season. 0 before it starts. */
  dayNumber: number
  totalDays: number
  /** Season not yet begun — the dashboard says "starts in N days" instead of 0%. */
  notStarted: boolean
  daysUntilStart: number
  /** Mean of daily scores for completed days (season start → yesterday).
   *  Null when no day has completed yet, so day one shows "—" not "0%". */
  consistencyPct: number | null
  /** Completed days actually scored, for the "through yesterday" caption. */
  scoredDays: number
  /** Oldest → newest, for the trend line. */
  series: { date: string; pct: number }[]
}

/** Daily protein target. One number, shared by the Today score and Fuel's
 *  insights so the two can never disagree about the goal. */
export const PROTEIN_TARGET_G = 180

/* ------------------------------------------------------- row definitions */

// Each row can be satisfied from more than one place, because the same fact is
// recorded in more than one place: checking a block off on /schedule, or
// tapping the habit on /habits. Either counts — the point is whether he did it,
// not which screen he told us on.
export type RowDef = {
  key: string
  label: string
  target: number
  pillar: Pillar
  /** Rhythm block slugs that count toward this row. */
  blocks?: string[]
  /** Habit names that count. `min` is the value required for count/duration.
   *  `counts` means the logged VALUE is the number of units done, rather than
   *  the habit being one unit — two posts is one habit logged at 2, not two
   *  habits. Without it a count habit could only ever satisfy one unit. */
  habits?: { name: string; min?: number; counts?: boolean }[]
  /** Only counts on days the rhythm actually schedules this block. */
  restWhenNoBlock?: string
}

/** Where a single unit of a row gets written when it's tapped. Keeping this
 *  next to the definitions means the API and the score can never disagree. */
export function writeTargetFor(rowKey: string, unit: number):
  | { kind: 'block'; slug: string }
  | { kind: 'habit'; name: string; unitsToValue: (units: number) => { value: number; done: boolean } }
  | null {
  const def = ROWS.find(r => r.key === rowKey)
  if (!def || unit < 0 || unit >= def.target) return null
  const slug = def.blocks?.[unit]
  if (slug) return { kind: 'block', slug }
  const habit = def.habits?.[Math.min(unit, (def.habits?.length ?? 1) - 1)]
  if (!habit) return null
  const min = habit.min
  return {
    kind: 'habit',
    name: habit.name,
    unitsToValue: (units: number) =>
      min !== undefined
        ? { value: units > 0 ? min : 0, done: units > 0 }
        : { value: units, done: units > 0 },
  }
}

export const ROWS: RowDef[] = [
  {
    key: 'meditation',
    label: 'Meditation',
    target: 2,
    pillar: 'Mind',
    blocks: ['meditation-am', 'meditation-pm'],
    habits: [{ name: 'Meditate (AM)' }, { name: 'Meditate (PM)' }],
  },
  { key: 'trading', label: 'Trading', target: 1, pillar: 'Trading', blocks: ['trading', 'trading-review'], habits: [{ name: 'Trade Plan' }] },
  { key: 'dryp', label: 'DRYP', target: 1, pillar: 'DRYP', blocks: ['dryp'] },
  {
    key: 'workout',
    label: 'Workout',
    target: 1,
    pillar: 'Body',
    blocks: ['gym'],
    habits: [{ name: 'Gym' }],
    restWhenNoBlock: 'gym',
  },
  // Two posts a day. Real posts win once the content engine is logging them;
  // until then the habit carries it.
  { key: 'content', label: 'Content', target: 2, pillar: 'Brand', habits: [{ name: 'Content', counts: true }] },
  // Confirmed meals drive this; the Protein Goal habit remains a manual
  // fallback for a day he ate without photographing anything.
  { key: 'nutrition', label: 'Nutrition', target: 1, pillar: 'Body', habits: [{ name: 'Protein Goal', min: PROTEIN_TARGET_G }] },
  { key: 'sleep', label: '10 PM Sleep', target: 1, pillar: 'Body', blocks: ['sleep'], habits: [{ name: 'Sleep', min: 8 }] },
]


/* --------------------------------------------------------------- scoring */

export type DayFacts = {
  /** Block slugs checked off. */
  blocks: Set<string>
  /** Habit name → logged value (0 when only marked done). */
  habits: Map<string, { value: number; done: boolean }>
  /** Posts published that day. */
  posts: number
  /** Protein from CONFIRMED meals. An unreviewed estimate is not a fact, so it
   *  never contributes to the day's score. */
  proteinG: number
}

export const emptyFacts = (): DayFacts => ({ blocks: new Set(), habits: new Map(), posts: 0, proteinG: 0 })

/** Score one date from already-fetched facts. Pure, so it is easy to test. */
export function scoreDay(dateStr: string, facts: DayFacts): TodayCard {
  const scheduled = new Set(templateForDate(dateStr).map(b => b.key))

  const rows: TodayRow[] = ROWS.map(def => {
    const rest = def.restWhenNoBlock ? !scheduled.has(def.restWhenNoBlock) : false
    if (rest) return { key: def.key, label: def.label, done: 0, target: 0, rest: true, pillar: def.pillar }

    let done = 0
    for (const slug of def.blocks ?? []) if (facts.blocks.has(slug)) done++
    for (const h of def.habits ?? []) {
      const log = facts.habits.get(h.name)
      if (!log) continue
      if (h.counts) done += Math.max(0, Math.floor(log.value))
      else if (h.min !== undefined ? log.value >= h.min : log.done || log.value > 0) done++
    }
    if (def.key === 'content') done = Math.max(done, facts.posts)
    if (def.key === 'nutrition' && facts.proteinG >= PROTEIN_TARGET_G) done = Math.max(done, 1)

    return { key: def.key, label: def.label, done: Math.min(done, def.target), target: def.target, pillar: def.pillar }
  })

  const graded = rows.filter(r => !r.rest)
  const done = graded.reduce((s, r) => s + r.done, 0)
  const total = graded.reduce((s, r) => s + r.target, 0)
  return { date: dateStr, rows, done, total, pct: total ? Math.round((done / total) * 100) : 0 }
}

