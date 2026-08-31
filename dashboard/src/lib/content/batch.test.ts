import { describe, expect, it } from 'vitest'
import { weekStartOf, nextWeekStart, scheduleSlots, parseBatch, WEEKLY_TARGET } from './batch'

describe('which week a batch is for', () => {
  it('finds the Monday of any day', () => {
    expect(weekStartOf('2026-09-07')).toBe('2026-09-07') // Monday itself
    expect(weekStartOf('2026-09-09')).toBe('2026-09-07') // Wednesday
    expect(weekStartOf('2026-09-13')).toBe('2026-09-07') // Sunday belongs to the week it ends
  })

  it('builds Saturday for the week that follows', () => {
    // Batching happens Saturday 2026-09-12 for the week starting Monday 09-14.
    expect(nextWeekStart('2026-09-12')).toBe('2026-09-14')
    expect(nextWeekStart('2026-09-13')).toBe('2026-09-14') // Sunday, same target
  })

  it('crosses a month boundary without drifting', () => {
    expect(nextWeekStart('2026-09-26')).toBe('2026-09-28')
    expect(weekStartOf('2026-10-01')).toBe('2026-09-28')
  })
})

describe('scheduling fourteen posts', () => {
  const times = ['09:00', '18:00']

  it('fills exactly seven days, two a day', () => {
    const slots = scheduleSlots('2026-09-14', WEEKLY_TARGET, times)
    expect(slots).toHaveLength(14)
    const dates = [...new Set(slots.map(s => s.slice(0, 10)))]
    expect(dates).toHaveLength(7)
    expect(dates[0]).toBe('2026-09-14')
    expect(dates[6]).toBe('2026-09-20')
    for (const d of dates) {
      expect(slots.filter(s => s.startsWith(d))).toHaveLength(2)
    }
  })

  it('alternates the two posting times', () => {
    const slots = scheduleSlots('2026-09-14', 4, times)
    expect(slots.map(s => s.slice(11, 16))).toEqual(['09:00', '18:00', '09:00', '18:00'])
  })

  it('stops early rather than tripling up a day', () => {
    // Nine selected is not "two a day plus one extra on Monday".
    const slots = scheduleSlots('2026-09-14', 9, times)
    const monday = slots.filter(s => s.startsWith('2026-09-14'))
    expect(monday).toHaveLength(2)
    expect(slots).toHaveLength(9)
    expect(slots[8].slice(0, 10)).toBe('2026-09-18')
  })

  it('spills into the following week only if asked for more than fourteen', () => {
    const slots = scheduleSlots('2026-09-14', 16, times)
    expect(slots[15].slice(0, 10)).toBe('2026-09-21')
  })
})

describe('reading the generated batch', () => {
  it('parses ideas and keeps what prompted them', () => {
    const ideas = parseBatch(JSON.stringify({
      ideas: [{
        title: 'The trade I did not take',
        angle: 'Patience is a position.',
        hook: 'I sat on my hands for two hours on Tuesday and it was the best trade of my week.',
        topic: 'Trading',
        source_note: 'Journal 2026-09-08: no setup, closed flat',
      }],
    }))
    expect(ideas).toHaveLength(1)
    expect(ideas[0].topic).toBe('Trading')
    expect(ideas[0].sourceNote).toMatch(/2026-09-08/)
  })

  it('survives code fences', () => {
    const ideas = parseBatch('```json\n{"ideas":[{"title":"x","hook":"y"}]}\n```')
    expect(ideas[0].title).toBe('x')
  })

  it('falls back to the hook when a title is missing', () => {
    const ideas = parseBatch(JSON.stringify({ ideas: [{ hook: 'Nobody tells you this about discipline.' }] }))
    expect(ideas[0].title).toMatch(/Nobody tells you/)
  })

  it('refuses an empty or malformed batch instead of returning nothing useful', () => {
    expect(() => parseBatch('nonsense')).toThrow(/usable JSON/)
    expect(() => parseBatch('{"ideas":[]}')).toThrow(/No usable ideas/)
    expect(() => parseBatch('{"nope":1}')).toThrow(/No ideas/)
  })
})
