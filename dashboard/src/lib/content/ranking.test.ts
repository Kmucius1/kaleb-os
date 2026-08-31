import { describe, expect, it } from 'vitest'
import { rankTopics, rankingSummary, isScored, type ScoredPost } from './ranking'

const post = (o: Partial<ScoredPost> = {}): ScoredPost => ({
  topic: 'Trading', avg_watch_pct: 50, saves: 5, views: 1000, reach: 900,
  followers_gained: 2, profile_visits: 20, posted_at: '2026-09-07T09:00:00Z', ...o,
})

const many = (n: number, o: Partial<ScoredPost> = {}) => Array.from({ length: n }, () => post(o))

describe('refusing to rank too early', () => {
  it('says nothing below the floor', () => {
    const r = rankTopics(many(6), 30)
    expect(r.ready).toBe(false)
    if (!r.ready) {
      expect(r.scored).toBe(6)
      expect(r.needed).toBe(30)
      expect(r.reason).toMatch(/noise/)
    }
    expect(rankingSummary(r)).toBeNull()
  })

  it('ignores posts with no completion data toward the floor', () => {
    // Thirty posts, but only ten have the signal the ranking is built from.
    const r = rankTopics([...many(10), ...many(20, { avg_watch_pct: null })], 30)
    expect(r.ready).toBe(false)
    if (!r.ready) expect(r.scored).toBe(10)
  })

  it('ignores posts with no topic', () => {
    expect(isScored(post({ topic: null }))).toBe(false)
    expect(isScored(post({ avg_watch_pct: null }))).toBe(false)
    expect(isScored(post())).toBe(true)
  })
})

describe('ranking once there is enough', () => {
  const set = [
    ...many(12, { topic: 'Trading', avg_watch_pct: 70, saves: 9 }),
    ...many(12, { topic: 'AI', avg_watch_pct: 40, saves: 2 }),
    ...many(8, { topic: 'Fitness', avg_watch_pct: 55, saves: 4 }),
  ]

  it('puts the topic that holds attention first', () => {
    const r = rankTopics(set, 30)
    expect(r.ready).toBe(true)
    if (!r.ready) return
    expect(r.topics[0].topic).toBe('Trading')
    expect(r.topics[r.topics.length - 1].topic).toBe('AI')
  })

  it('does not let raw views decide it', () => {
    // AI has ten times the views but half the completion and a fifth the saves.
    const skewed = [
      ...many(15, { topic: 'AI', avg_watch_pct: 30, saves: 1, views: 100000 }),
      ...many(15, { topic: 'Trading', avg_watch_pct: 75, saves: 10, views: 1000 }),
    ]
    const r = rankTopics(skewed, 30)
    if (!r.ready) throw new Error('should be ready')
    expect(r.topics[0].topic).toBe('Trading')
  })

  it('drops a topic with too few posts to mean anything', () => {
    const r = rankTopics([...set, post({ topic: 'Spirituality', avg_watch_pct: 99, saves: 99 })], 30)
    if (!r.ready) throw new Error('should be ready')
    // A single 99% post would otherwise top the chart on one data point.
    expect(r.topics.map(t => t.topic)).not.toContain('Spirituality')
  })

  it('does not zero out a strong topic nobody saved', () => {
    const r = rankTopics([
      ...many(15, { topic: 'Trading', avg_watch_pct: 80, saves: 0 }),
      ...many(15, { topic: 'AI', avg_watch_pct: 20, saves: 0 }),
    ], 30)
    if (!r.ready) throw new Error('should be ready')
    expect(r.topics[0].topic).toBe('Trading')
    expect(r.topics[0].score).toBeGreaterThan(0)
  })

  it('summarises for the weekly review', () => {
    const s = rankingSummary(rankTopics(set, 30))
    expect(s).toMatch(/Trading/)
    expect(s).toMatch(/completion/)
  })
})
