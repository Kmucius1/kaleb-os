// The six pillars. Canonical, closed set — everything in KalebOS (blocks,
// habits, journals, tasks, insights) hangs off one of these.
//
// There is deliberately NO "Nature" pillar: beach, sunrise, sunset and the
// Horizon Walk live under Spirit, with an optional Body benefit.

export const PILLARS = ["Spirit", "Mind", "Body", "Money", "Mission", "Relationships"] as const;

export type Pillar = (typeof PILLARS)[number];

export function isPillar(v: unknown): v is Pillar {
  return typeof v === "string" && (PILLARS as readonly string[]).includes(v);
}

/** Never throws — unknown/legacy values fall back to Spirit rather than crashing a render. */
export function toPillar(v: unknown): Pillar {
  return isPillar(v) ? v : "Spirit";
}

export const PILLAR_META: Record<Pillar, { color: string; cssVar: string; of: string }> = {
  Spirit: {
    color: "#a78bfa",
    cssVar: "var(--spirit)",
    of: "Meditation, journaling, silence, gratitude, beach, sunrise and sunset, presence, spiritual reflection",
  },
  Mind: {
    color: "#60a5fa",
    cssVar: "var(--mind)",
    of: "AI study, trading education, reading, courses, podcasts, research, skill development",
  },
  Body: {
    color: "#34d399",
    cssVar: "var(--body)",
    of: "Sleep, gym, strength, weight gain, nutrition, protein, hydration, recovery, mobility",
  },
  Money: {
    color: "#fbbf24",
    cssVar: "var(--money)",
    of: "Trading, DRYP revenue, personal income, financial tracking, investments, business opportunities",
  },
  Mission: {
    color: "#fb923c",
    cssVar: "var(--mission)",
    of: "DRYP, KalebOS, content creation, personal brand, trading bot, TikTok Shop automation, e-commerce systems, long-term assets",
  },
  Relationships: {
    color: "#f472b6",
    cssVar: "var(--relationships)",
    of: "Family, friends, business partners, clients, networking, LinkedUp, intentional social time",
  },
};

export const pillarColor = (p: unknown): string => PILLAR_META[toPillar(p)].color;
