import { describe, expect, it } from 'vitest'
import { bucketOf, dedupeKey } from './tasks'

const TODAY = '2026-08-11'
const triaged = (t: Parameters<typeof bucketOf>[0]) => ({ triaged_at: '2026-08-11T00:00:00Z', ...t })

describe('bucketOf', () => {
  it('routes someone else’s action item away from his own list', () => {
    expect(bucketOf(triaged({ owner: 'other', priority: 9 }), TODAY)).toBe('notmine')
    expect(bucketOf(triaged({ owner: 'team', priority: 9 }), TODAY)).toBe('notmine')
  })

  it('splits his own tasks by score', () => {
    expect(bucketOf(triaged({ owner: 'kaleb', priority: 9 }), TODAY)).toBe('now')
    expect(bucketOf(triaged({ owner: 'kaleb', priority: 8 }), TODAY)).toBe('now')
    expect(bucketOf(triaged({ owner: 'kaleb', priority: 7 }), TODAY)).toBe('soon')
    expect(bucketOf(triaged({ owner: 'kaleb', priority: 5 }), TODAY)).toBe('soon')
    expect(bucketOf(triaged({ owner: 'kaleb', priority: 4 }), TODAY)).toBe('someday')
    expect(bucketOf(triaged({ owner: 'kaleb', priority: 1 }), TODAY)).toBe('someday')
  })

  it('promotes a due task regardless of score', () => {
    expect(bucketOf(triaged({ owner: 'kaleb', priority: 2, due_date: TODAY }), TODAY)).toBe('now')
    expect(bucketOf(triaged({ owner: 'kaleb', priority: 2, due_date: '2026-08-01' }), TODAY)).toBe('now')
    expect(bucketOf(triaged({ owner: 'kaleb', priority: 2, due_date: '2026-09-01' }), TODAY)).toBe('someday')
  })

  it('does not let a due date drag someone else’s task onto his list', () => {
    expect(bucketOf(triaged({ owner: 'other', priority: 2, due_date: TODAY }), TODAY)).toBe('notmine')
  })

  it('flags rows filed before triage existed instead of guessing', () => {
    expect(bucketOf({ owner: null, priority: 6, triaged_at: null }, TODAY)).toBe('untriaged')
    // A row with an owner but no triaged_at was set by hand — trust the owner.
    expect(bucketOf({ owner: 'kaleb', priority: 9, triaged_at: null }, TODAY)).toBe('now')
  })
})

describe('dedupeKey', () => {
  it('collapses restatements of one commitment across transcript chunks', () => {
    expect(dedupeKey('Discuss with Leanne about singing.')).toBe(dedupeKey('Discuss with Leanne about singing'))
    expect(dedupeKey('Follow up with the client')).toBe(dedupeKey('Follow up with client!'))
  })

  it('keeps genuinely different tasks apart', () => {
    expect(dedupeKey('Call Shannon')).not.toBe(dedupeKey('Call Tyler'))
  })
})
