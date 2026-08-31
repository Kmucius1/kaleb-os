// Which topics actually earn attention.
//
// Ranked by completion rate × saves, not by views.
//
// Views measure how far the platform pushed a video, which is largely a
// function of how many it pushed before it. Completion rate measures whether
// the person who started it stayed, and saves measure whether it was worth
// keeping. Those two are what convert a viewer into a follower, and they are
// the two a creator can actually influence.
//
// The other rule here matters more than the formula: below a floor of scored
// posts this returns nothing at all. A ranking built on six posts will be
// believed, acted on, and wrong — and the cost of that is a season of content
// chasing a pattern that was noise.
//
// Pure module.

export type ScoredPost = {
  topic: string | null
  avg_watch_pct: number | null
  saves: number | null
  views: number | null
  reach: number | null
  followers_gained: number | null
  profile_visits: number | null
  posted_at: string | null
}

export type TopicScore = {
  topic: string
  posts: number
  /** Mean completion, 0–100. */
  completion: number
  /** Mean saves per post. */
  saves: number
  /** Mean followers gained per post. */
  followers: number
  /** completion × saves, the ranking number. Comparable only within a run. */
  score: number
}

export type Ranking =
  | { ready: false; scored: number; needed: number; reason: string }
  | { ready: true; scored: number; topics: TopicScore[] }

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
const round = (n: number, dp = 1) => Math.round(n * 10 ** dp) / 10 ** dp

/** A post counts toward the ranking only if it has the two signals the ranking
 *  is built from. A post with views but no completion tells us nothing here. */
export const isScored = (p: ScoredPost): boolean =>
  !!p.topic && p.avg_watch_pct !== null && Number.isFinite(p.avg_watch_pct)

export function rankTopics(posts: ScoredPost[], minPosts = 30): Ranking {
  const scored = posts.filter(isScored)

  if (scored.length < minPosts) {
    return {
      ready: false,
      scored: scored.length,
      needed: minPosts,
      reason:
        `Ranking needs ${minPosts} posts with completion data; there are ${scored.length}. ` +
        `A ranking built on fewer would be believed and acted on, and it would be noise.`,
    }
  }

  const byTopic = new Map<string, ScoredPost[]>()
  for (const p of scored) {
    const key = p.topic as string
    ;(byTopic.get(key) ?? byTopic.set(key, []).get(key)!).push(p)
  }

  const topics: TopicScore[] = [...byTopic.entries()]
    // A topic with one post is not a trend either, even in a large set.
    .filter(([, ps]) => ps.length >= 3)
    .map(([topic, ps]) => {
      const completion = avg(ps.map(p => p.avg_watch_pct as number))
      const saves = avg(ps.map(p => Number(p.saves) || 0))
      const followers = avg(ps.map(p => Number(p.followers_gained) || 0))
      return {
        topic,
        posts: ps.length,
        completion: round(completion),
        saves: round(saves),
        followers: round(followers),
        // Saves are sparse; +1 keeps a strong-completion topic from scoring
        // zero purely because nobody happened to save it.
        score: round(completion * (saves + 1), 1),
      }
    })
    .sort((a, b) => b.score - a.score)

  return { ready: true, scored: scored.length, topics }
}

/** One line for the weekly review, or null when there is nothing honest to say. */
export function rankingSummary(r: Ranking): string | null {
  if (!r.ready) return null
  if (r.topics.length < 2) return null
  const best = r.topics[0]
  const worst = r.topics[r.topics.length - 1]
  return (
    `${best.topic} holds attention best — ${best.completion}% average completion across ${best.posts} posts, ` +
    `${best.saves} saves each. ${worst.topic} is the weakest at ${worst.completion}%. ` +
    `Weight next Saturday's batch accordingly.`
  )
}
