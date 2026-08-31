import { describe, expect, it } from 'vitest'
import { scoreDay, addDays, daysBetween } from './score'

// Season 1 dates. 2026-09-07 is a Monday (trains), 2026-09-09 a Wednesday
// (rest), 2026-09-13 a Sunday (rest).
const MON = '2026-09-07'
const WED = '2026-09-09'
const SUN = '2026-09-13'

const facts = (o: { blocks?: string[]; habits?: Record<string, number | boolean>; posts?: number; proteinG?: number } = {}) => ({
  blocks: new Set(o.blocks ?? []),
  habits: new Map(
    Object.entries(o.habits ?? {}).map(([name, v]) => [
      name,
      typeof v === 'boolean' ? { value: 0, done: v } : { value: v, done: false },
    ]),
  ),
  posts: o.posts ?? 0,
  proteinG: o.proteinG ?? 0,
})

const row = (c: ReturnType<typeof scoreDay>, key: string) => c.rows.find(r => r.key === key)!

describe('the seven rows', () => {
  it('scores an empty day at zero without crashing', () => {
    const c = scoreDay(MON, facts())
    expect(c.done).toBe(0)
    expect(c.pct).toBe(0)
    expect(c.rows).toHaveLength(7)
  })

  it('counts a block check-off and a habit tap as the same fact', () => {
    // Checked the block off on /schedule …
    expect(row(scoreDay(MON, facts({ blocks: ['dryp'] })), 'dryp').done).toBe(1)
    // … or tapped the habit on /habits. Either means he did it.
    expect(row(scoreDay(MON, facts({ habits: { Gym: true } })), 'workout').done).toBe(1)
  })

  it('never double-counts the same row from two sources', () => {
    const c = scoreDay(MON, facts({ blocks: ['gym'], habits: { Gym: true } }))
    expect(row(c, 'workout').done).toBe(1)
    expect(row(c, 'workout').target).toBe(1)
  })

  it('tracks meditation as two separate sittings', () => {
    expect(row(scoreDay(MON, facts({ blocks: ['meditation-am'] })), 'meditation').done).toBe(1)
    const both = scoreDay(MON, facts({ blocks: ['meditation-am', 'meditation-pm'] }))
    expect(row(both, 'meditation').done).toBe(2)
    expect(row(both, 'meditation').target).toBe(2)
  })

  it('counts real posts toward the two-a-day target', () => {
    expect(row(scoreDay(MON, facts({ posts: 2 })), 'content').done).toBe(2)
    // Caps at the target — three posts is a good day, not a 150% day.
    expect(row(scoreDay(MON, facts({ posts: 5 })), 'content').done).toBe(2)
  })

  it('reads a counting habit as units, not as a single tick', () => {
    // Two posts is one habit logged at 2 — not two habits. Scoring this as
    // "the habit exists, so +1" capped Content at 1/2 forever.
    expect(row(scoreDay(MON, facts({ habits: { Content: 1 } })), 'content').done).toBe(1)
    expect(row(scoreDay(MON, facts({ habits: { Content: 2 } })), 'content').done).toBe(2)
    expect(row(scoreDay(MON, facts({ habits: { Content: 9 } })), 'content').done).toBe(2)
  })

  it('lets confirmed meals satisfy nutrition without the habit', () => {
    expect(row(scoreDay(MON, facts({ proteinG: 195 })), 'nutrition').done).toBe(1)
    expect(row(scoreDay(MON, facts({ proteinG: 140 })), 'nutrition').done).toBe(0)
  })

  it('never double-counts meals and the protein habit', () => {
    const c = scoreDay(MON, facts({ proteinG: 195, habits: { 'Protein Goal': 195 } }))
    expect(row(c, 'nutrition').done).toBe(1)
  })

  it('requires a count habit to actually reach its number', () => {
    expect(row(scoreDay(MON, facts({ habits: { 'Protein Goal': 120 } })), 'nutrition').done).toBe(0)
    expect(row(scoreDay(MON, facts({ habits: { 'Protein Goal': 190 } })), 'nutrition').done).toBe(1)
  })
})

describe('rest days', () => {
  it('renders Workout as REST on Wednesday and Sunday', () => {
    for (const d of [WED, SUN]) {
      const w = row(scoreDay(d, facts()), 'workout')
      expect(w.rest, d).toBe(true)
      expect(w.target, d).toBe(0)
    }
    expect(row(scoreDay(MON, facts()), 'workout').rest).toBeFalsy()
  })

  it('lets a rest day reach 100% without a workout', () => {
    const perfectRestDay = facts({
      blocks: ['meditation-am', 'meditation-pm', 'trading', 'dryp', 'sleep'],
      habits: { 'Protein Goal': 190 },
      posts: 2,
    })
    const wed = scoreDay(WED, perfectRestDay)
    expect(wed.pct).toBe(100)

    // The same effort on a training day is not 100% — the workout is missing.
    const mon = scoreDay(MON, perfectRestDay)
    expect(mon.pct).toBeLessThan(100)
  })

  it('shrinks the denominator on a rest day rather than scoring a miss', () => {
    expect(scoreDay(WED, facts()).total).toBeLessThan(scoreDay(MON, facts()).total)
  })
})

describe('date maths', () => {
  it('counts Season 1 as exactly 90 days', () => {
    expect(daysBetween('2026-09-01', '2026-11-29') + 1).toBe(90)
  })

  it('crosses month ends and DST without drifting', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01')
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31')
    // US DST ends 2026-11-01; the day count either side must stay whole.
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2)
  })
})
