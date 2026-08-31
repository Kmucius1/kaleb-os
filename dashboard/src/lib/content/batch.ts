// The Saturday batch: 28 ideas in, 14 scheduled videos out.
//
// Two decisions worth stating:
//
//   * Twenty-eight, not fourteen. Choosing 14 from 28 is a real edit — half get
//     cut. Generating exactly 14 would make "select" a rubber stamp, and the
//     selection is where his taste enters the system.
//
//   * Ideas come from his actual week, not from a topic list. "Five AI tools
//     for founders" is content anyone could make; "what I learned losing a
//     trade on Tuesday" is content only he can. The generator is fed journal
//     entries, trades and wins, and each idea records what prompted it.
//
// Pure module: scheduling maths and the prompt. The route does the I/O.

export const WEEKLY_TARGET = 14
export const IDEAS_PER_BATCH = 28
export const POSTS_PER_DAY = 2

export type BatchIdea = {
  title: string
  angle: string
  hook: string
  topic: string
  sourceNote: string | null
}

/** Monday of the week containing `dateStr` (ET dates, no time component). */
export function weekStartOf(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`)
  const dow = d.getUTCDay() // 0 = Sunday
  const backToMonday = dow === 0 ? 6 : dow - 1
  d.setUTCDate(d.getUTCDate() - backToMonday)
  return d.toISOString().slice(0, 10)
}

/** The Monday *after* `dateStr` — the week a Saturday batch is built for. */
export function nextWeekStart(dateStr: string): string {
  const thisMonday = weekStartOf(dateStr)
  const d = new Date(`${thisMonday}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 7)
  return d.toISOString().slice(0, 10)
}

/**
 * Lay N posts across the week at the given times, two a day.
 *
 * Returns ET-local ISO timestamps. Fourteen posts fill Monday to Sunday
 * exactly; fewer stop early rather than doubling up, because three posts in one
 * day is not what "two a day" meant.
 */
export function scheduleSlots(weekStart: string, count: number, times: string[]): string[] {
  const perDay = times.length || POSTS_PER_DAY
  const out: string[] = []
  for (let i = 0; i < count; i++) {
    const dayOffset = Math.floor(i / perDay)
    const time = times[i % perDay] ?? '09:00'
    const d = new Date(`${weekStart}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() + dayOffset)
    out.push(`${d.toISOString().slice(0, 10)}T${time}:00`)
  }
  return out
}

export const BATCH_SYSTEM = `You generate short-form talking-head video ideas for Kaleb Mucius.

Kaleb runs DRYP (an AI automation agency), trades markets daily, lifts, meditates
and journals, and is building a personal brand by talking to camera about his
actual life.

The format is FIXED: one person talking to a phone camera for 30-60 seconds.
Do not propose skits, interviews, b-roll montages, carousels or tutorials.

What makes these work:
- They come from something that actually happened to him. You will be given his
  journal entries, trades and wins from the past week. USE THEM. An idea rooted
  in a real Tuesday beats a generic list every time.
- One idea, one video. Not "5 things" — one thing, said properly.
- The hook is the first line he says out loud. It must earn the next three
  seconds. No "In this video I'm going to..." and no rhetorical throat-clearing.
- Specific beats clever. A real number, a real mistake, a real moment.

Hard constraints on the SET, not just each idea:
- No two ideas may make the same argument. Rephrasing one thought eight ways is
  one idea, not eight, and it produces a week of content that sounds identical.
- At most TWO ideas may come from any single source. If his week was quiet, that
  is fine — draw the rest from his ongoing practice (the trading process, the
  training block, the meditation habit, running DRYP, building KalebOS) rather
  than squeezing a thin week dry.
- Spread across topics. No topic may exceed a quarter of the set, and trading,
  fitness and spirituality must each appear at least twice.

Topics his audience follows him for: AI, entrepreneurship and DRYP, trading and
trading psychology, spirituality and meditation, fitness and discipline,
personal development, and the lessons inside ordinary days.

Return ONLY JSON:
{ "ideas": [
    { "title": "short internal label",
      "angle": "one sentence on what the video actually argues",
      "hook": "the exact first line he says",
      "topic": "AI | Business | Trading | Spirituality | Fitness | Discipline | Personal",
      "source_note": "the journal entry / trade / event this came from, or null" }
] }`

/** Build the user prompt from whatever his week actually contained. */
export function batchPrompt(input: {
  count: number
  weekStart: string
  journal: { date: string; text: string }[]
  trades: { date: string; text: string }[]
  wins: string[]
}): string {
  const section = (title: string, lines: string[]) =>
    lines.length ? `\n${title}:\n${lines.map(l => `- ${l}`).join('\n')}` : ''

  const life = [
    section('JOURNAL THIS WEEK', input.journal.map(j => `${j.date}: ${j.text.slice(0, 400)}`)),
    section('TRADES THIS WEEK', input.trades.map(t => `${t.date}: ${t.text.slice(0, 200)}`)),
    section('WINS AND COMPLETIONS', input.wins.slice(0, 20)),
  ].join('')

  const grounding = life.trim()
    ? life
    : '\n(No journal or trades logged this week — draw on his ongoing work at DRYP, his trading practice, training and meditation, and keep the ideas concrete rather than generic.)'

  const cap = Math.ceil(input.count / 4)
  return `Generate exactly ${input.count} talking-head video ideas for the week beginning ${input.weekStart}.

Ground them in what actually happened:${grounding}

Requirements for this set:
- Exactly ${input.count} ideas, every one making a DIFFERENT argument.
- At most 2 ideas from any single journal entry, trade or event.
- At most ${cap} ideas on any one topic.
- Trading, Fitness and Spirituality must each appear at least twice.
- Where the week gives you nothing, use his standing practice rather than
  restating an entry you have already used.`
}

export function parseBatch(raw: string): BatchIdea[] {
  const t = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  let parsed: unknown
  try {
    parsed = JSON.parse(t)
  } catch {
    throw new Error('The model did not return usable JSON for the batch.')
  }
  const arr = (parsed as { ideas?: unknown[] })?.ideas
  if (!Array.isArray(arr)) throw new Error('No ideas in the response.')

  const out: BatchIdea[] = []
  for (const r of arr as Record<string, unknown>[]) {
    const title = typeof r?.title === 'string' ? r.title.trim() : ''
    const hook = typeof r?.hook === 'string' ? r.hook.trim() : ''
    if (!title && !hook) continue
    out.push({
      title: title || hook.slice(0, 60),
      angle: typeof r?.angle === 'string' ? r.angle.trim() : '',
      hook,
      topic: typeof r?.topic === 'string' && r.topic.trim() ? r.topic.trim() : 'Personal',
      sourceNote: typeof r?.source_note === 'string' && r.source_note.trim() ? r.source_note.trim() : null,
    })
  }
  if (out.length === 0) throw new Error('No usable ideas in the response.')
  return out
}
