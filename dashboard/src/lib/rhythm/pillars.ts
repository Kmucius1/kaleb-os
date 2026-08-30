// The six pillars. Canonical, closed set — everything in KalebOS (blocks,
// habits, journals, tasks, insights) hangs off one of these.
//
// Season 1 (Sep 2026) reshaped this set around the five things Kaleb is
// actually building a life around, keeping Relationships as a sixth:
//
//   Money        → DRYP      the company, minus trading
//   Trading      → NEW       split out of Money; it is its own craft, its own
//                            block, its own scoreboard
//   Spirit + Mind→ Mind      meditation, journaling, reflection, learning and
//                            mental clarity were never separable in practice
//   Mission      → Brand     content and distribution
//   Body, Relationships      unchanged
//
// There is deliberately NO "Nature" pillar: beach, sunrise, sunset and the
// Horizon Walk live under Mind, with an optional Body benefit.

export const PILLARS = ["DRYP", "Mind", "Body", "Trading", "Brand", "Relationships"] as const;

export type Pillar = (typeof PILLARS)[number];

/** Legacy pillar names → their Season 1 replacement. Kept forever: old rows,
 *  old journals and old content ideas keep resolving instead of falling back. */
const LEGACY: Record<string, Pillar> = {
  Money: "DRYP",
  Spirit: "Mind",
  Mission: "Brand",
  // Already-correct names pass through the same map for free.
  DRYP: "DRYP",
  Mind: "Mind",
  Body: "Body",
  Trading: "Trading",
  Brand: "Brand",
  Relationships: "Relationships",
};

export function isPillar(v: unknown): v is Pillar {
  return typeof v === "string" && (PILLARS as readonly string[]).includes(v);
}

/** Never throws — legacy names remap, unknown values fall back to Mind
 *  rather than crashing a render. */
export function toPillar(v: unknown): Pillar {
  if (isPillar(v)) return v;
  if (typeof v === "string" && LEGACY[v]) return LEGACY[v];
  return "Mind";
}

export const PILLAR_META: Record<Pillar, { color: string; cssVar: string; label: string; of: string }> = {
  DRYP: {
    color: "#fbbf24",
    cssVar: "var(--dryp)",
    label: "DRYP",
    of: "The company, the mission, the wealth engine. Clients, revenue, sales, systems, team, products.",
  },
  Mind: {
    color: "#a78bfa",
    cssVar: "var(--mind)",
    label: "Mind & Spirit",
    of: "Meditation, journaling, reflection, spiritual learning, mental clarity, emotional awareness, study, reading, presence.",
  },
  Body: {
    color: "#34d399",
    cssVar: "var(--body)",
    label: "Body",
    of: "Strength training, muscle, nutrition, protein, sleep, hydration, grooming, appearance, physical confidence.",
  },
  Trading: {
    color: "#60a5fa",
    cssVar: "var(--trading)",
    label: "Trading",
    of: "Daily market participation, analysis, trading journal, psychology, education, backtesting, trading AI and software.",
  },
  Brand: {
    color: "#fb923c",
    cssVar: "var(--brand)",
    label: "Personal Brand",
    of: "Talking-head content, distribution, social growth, audience, the ideas and the life going out consistently.",
  },
  Relationships: {
    color: "#f472b6",
    cssVar: "var(--relationships)",
    label: "Relationships",
    of: "Family, friends, business partners, clients, networking, intentional social time.",
  },
};

export const pillarColor = (p: unknown): string => PILLAR_META[toPillar(p)].color;
export const pillarLabel = (p: unknown): string => PILLAR_META[toPillar(p)].label;
