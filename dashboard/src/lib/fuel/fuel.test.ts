import { describe, expect, it } from 'vitest'
import { parseEstimate, sumItems, mealConfidence, bandFor, stripFences, type FuelItem } from './estimate'
import { trendOf, hitRate, trainingFrequency, insightsFor, hasSignal, type DayFuel } from './trends'

const item = (o: Partial<FuelItem> = {}): FuelItem => ({
  name: 'thing', qty: 1, unit: 'serving',
  calories: 100, protein_g: 10, carbs_g: 5, fat_g: 3, fiber_g: 1, produce_servings: 0,
  confidence: 0.8, ...o,
})

const day = (o: Partial<DayFuel> & { date: string }): DayFuel => ({
  calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, produce_servings: 0,
  meals: 0, weight_lb: null, water_oz: null, sleep_h: null, trained: null, ...o,
})

const days = (n: number, f: (i: number) => Partial<DayFuel>): DayFuel[] =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(2026, 8, 1))
    d.setUTCDate(d.getUTCDate() + i)
    return day({ date: d.toISOString().slice(0, 10), ...f(i) })
  })

describe('reading the model', () => {
  it('parses a clean response', () => {
    const e = parseEstimate(JSON.stringify({
      items: [{ name: 'chicken', qty: 6, unit: 'oz', calories: 280, protein_g: 52, carbs_g: 0, fat_g: 6, fiber_g: 0, produce_servings: 0, confidence: 0.8 }],
      note: 'judged against a 10-inch plate', overall_confidence: 0.8,
    }))
    expect(e.items).toHaveLength(1)
    expect(e.items[0].protein_g).toBe(52)
    expect(e.note).toMatch(/10-inch/)
  })

  it('survives code fences the model was told not to use', () => {
    const raw = '```json\n{"items":[{"name":"apple","calories":95,"confidence":0.9}]}\n```'
    expect(parseEstimate(raw).items[0].name).toBe('apple')
    expect(stripFences('```\n{}\n```')).toBe('{}')
  })

  it('drops a nameless item rather than losing the whole meal', () => {
    const e = parseEstimate(JSON.stringify({ items: [{ name: '', calories: 200 }, { name: 'rice', calories: 200, confidence: 0.7 }] }))
    expect(e.items.map(i => i.name)).toEqual(['rice'])
  })

  it('treats an unrated item as uncertain, not as certain', () => {
    // A model that forgets to score itself has not thereby earned trust.
    const e = parseEstimate(JSON.stringify({ items: [{ name: 'stew', calories: 400 }] }))
    expect(e.items[0].confidence).toBeLessThan(0.5)
  })

  it('refuses nonsense instead of inventing a meal', () => {
    expect(() => parseEstimate('not json at all')).toThrow(/usable JSON/)
    expect(() => parseEstimate('{"items":[]}')).toThrow(/No food/)
  })

  it('never lets a negative macro through', () => {
    const e = parseEstimate(JSON.stringify({ items: [{ name: 'x', calories: -50, protein_g: -3, confidence: 0.6 }] }))
    expect(e.items[0].calories).toBe(0)
    expect(e.items[0].protein_g).toBe(0)
  })
})

describe('confidence', () => {
  it('takes the weakest item, not the average', () => {
    // Four confident sides must not bury one unidentifiable centrepiece —
    // that is precisely the meal a human needs to look at.
    const items = [item({ confidence: 0.9 }), item({ confidence: 0.9 }), item({ confidence: 0.9 }), item({ confidence: 0.3 })]
    expect(mealConfidence(items)).toBe(0.3)
  })

  it('will not accept a model rating itself above its own weakest item', () => {
    expect(mealConfidence([item({ confidence: 0.4 })], 0.95)).toBe(0.4)
  })

  it('bands honestly', () => {
    expect(bandFor(0.9)).toBe('high')
    expect(bandFor(0.6)).toBe('medium')
    expect(bandFor(0.3)).toBe('low')
  })
})

describe('totals', () => {
  it('adds items up', () => {
    const t = sumItems([item(), item()])
    expect(t.protein_g).toBe(20)
    expect(t.calories).toBe(200)
  })

  it('refuses to print a precision the photo cannot support', () => {
    // 618 kcal from a photograph is a lie of precision. 620 is honest.
    const t = sumItems([item({ calories: 313 }), item({ calories: 305 })])
    expect(t.calories).toBe(620)
    expect(t.calories % 10).toBe(0)
  })
})

describe('trends, not verdicts', () => {
  it('says nothing from too few weigh-ins', () => {
    const t = trendOf(days(7, i => (i < 2 ? { weight_lb: 185 } : {})), d => d.weight_lb)
    expect(t.avg).toBeNull()
    expect(t.samples).toBe(2)
  })

  it('averages the last seven days and compares to the seven before', () => {
    const t = trendOf(days(14, i => ({ weight_lb: i < 7 ? 184 : 186 })), d => d.weight_lb)
    expect(t.avg).toBe(186)
    expect(t.change).toBe(2)
  })

  it('reports a hit rate rather than a streak', () => {
    const r = hitRate(days(7, i => ({ meals: 1, protein_g: i % 2 === 0 ? 190 : 120 })), d => (d.meals > 0 ? d.protein_g : null), 180)
    expect(r).toEqual({ hits: 4, of: 7, pct: 57 })
  })

  it('never counts a scheduled rest day as a missed session', () => {
    // trained === null means the rhythm did not ask. Friday he was clearly
    // around — he logged a meal — and skipped the gym, so that one counts.
    const week = [
      day({ date: '2026-09-07', trained: true }), day({ date: '2026-09-08', trained: true }),
      day({ date: '2026-09-09', trained: null }), day({ date: '2026-09-10', trained: true }),
      day({ date: '2026-09-11', trained: false, meals: 2 }), day({ date: '2026-09-12', trained: null }),
      day({ date: '2026-09-13', trained: null }),
    ]
    expect(trainingFrequency(week)).toEqual({ done: 3, asked: 4 })
    expect(hasSignal(day({ date: 'x', trained: false }))).toBe(false)
    expect(hasSignal(day({ date: 'x', trained: false, meals: 2 }))).toBe(true)
  })
})

describe('insights', () => {
  it('stays silent on thin data rather than saying something believable and wrong', () => {
    expect(insightsFor(days(2, () => ({ weight_lb: 185, meals: 1, protein_g: 200 })), { protein: 180 })).toEqual([])
  })

  it('reads weight gain on a lifting block as the goal, not a problem', () => {
    const out = insightsFor(days(14, i => ({ weight_lb: i < 7 ? 183 : 184.5 })), { protein: 180 })
    expect(out[0].tone).toBe('good')
    expect(out[0].text).toMatch(/7-day average/)
  })

  it('never comments on a single day', () => {
    const out = insightsFor(days(14, i => ({ weight_lb: 185, meals: 1, protein_g: i === 3 ? 40 : 200, trained: i % 3 !== 0 })), { protein: 180 })
    for (const i of out) {
      expect(i.text).not.toMatch(/yesterday|today/i)
    }
    expect(out.length).toBeGreaterThan(0)
  })
})

describe('days before he started', () => {
  it('does not count an unused stretch as missed sessions', () => {
    // Thirty days of nothing logged is not thirty days of failure. Before this
    // guard the Body page opened with "Trained 0 of the 21 sessions the
    // schedule asked for" on day one.
    const untouched = days(30, () => ({ trained: false }))
    expect(trainingFrequency(untouched)).toEqual({ done: 0, asked: 0 })
    expect(insightsFor(untouched, { protein: 180 })).toEqual([])
  })

  it('counts a day the moment there is any sign of use', () => {
    const used = days(7, i => ({ trained: i % 2 === 0, meals: 1, protein_g: 200 }))
    expect(trainingFrequency(used).asked).toBeGreaterThan(0)
  })

  it('names the window it is talking about', () => {
    const out = insightsFor(days(14, () => ({ trained: true, meals: 1, protein_g: 200 })), { protein: 180 })
    const training = out.find(i => i.text.includes('Trained'))
    expect(training?.text).toMatch(/this week/)
  })
})
