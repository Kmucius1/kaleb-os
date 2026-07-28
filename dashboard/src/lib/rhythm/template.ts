// The default rhythm — Kaleb's law, as data.
//
// Times are minutes since ET midnight. The morning through commute-home is
// clock-anchored (real obligations: markets open, the office exists). Everything
// after the commute home is *sun-anchored*: the engine lays the evening out
// around the Horizon Walk, because sunset moves ~2 hours across the year and
// hardcoding 6:00 PM would break the ritual half the year.

import type { DayType, TemplateBlock } from "./types";

export const H = (h: number, m = 0) => h * 60 + m;

/** Sleep target: 8h+ protected. Wake 6:00 AM, lights out ~9:45–10:00 PM. */
export const SLEEP = {
  wakeMin: H(6, 0),
  targetSleepMin: H(21, 45),
  latestSleepMin: H(22, 0),
  minHours: 8,
};

/** Commute is configurable 30–40 min; we plan with 40 so lateness is impossible. */
export const COMMUTE = { minMinutes: 30, maxMinutes: 40, planWith: 40 };

/** Horizon Walk: 30–60 min at the beach, every day, minimum 5 of 7. */
export const HORIZON = {
  minMinutes: 30,
  maxMinutes: 60,
  defaultMinutes: 45,
  weeklyMinimum: 5,
  weeklyIdeal: 7,
  /** Travel each way to the beach, from config; this is the fallback. */
  travelMinutes: 12,
};

const WEEKDAY: TemplateBlock[] = [
  {
    key: "wake",
    title: "Wake Up",
    pillar: "Body",
    kind: "ritual",
    start: H(6, 0),
    end: H(6, 10),
    flexibility: "protected",
    priority: 1,
    energy: "low",
    detail: "Water. Hygiene. No social media. Open KalebOS and read the morning brief.",
    cue: "Good morning — water first, then open your brief",
  },
  {
    key: "meditation-am",
    title: "Morning Meditation",
    pillar: "Spirit",
    kind: "ritual",
    start: H(6, 10),
    end: H(6, 30),
    flexibility: "flexible",
    priority: 2,
    minMinutes: 10,
    energy: "low",
    detail: "Silence. Presence. Mental alignment before the day asks anything of you.",
    cue: "Time to sit — 20 minutes of silence",
  },
  {
    key: "journal-am",
    title: "Morning Journal",
    pillar: "Spirit",
    kind: "journal",
    start: H(6, 30),
    end: H(6, 50),
    flexibility: "flexible",
    priority: 2,
    minMinutes: 10,
    energy: "medium",
    detail:
      "Who am I choosing to be today? The three most important outcomes? What would make today feel aligned? What thought or emotion needs attention?",
    cue: "Morning journal — who are you choosing to be today?",
  },
  {
    key: "trading",
    title: "Trading Session",
    pillar: "Money",
    identity: "Trader",
    kind: "work",
    start: H(7, 0),
    end: H(9, 0),
    flexibility: "protected",
    priority: 1,
    energy: "high",
    detail:
      "Qualified setups only — no forced trades. Track bias, risk, emotions, entries, exits, rules. Review or backtest while waiting. Bot work only if it never touches live execution.",
    cue: "Markets — trading session starts now",
  },
  {
    key: "gym",
    title: "Gym",
    pillar: "Body",
    kind: "training",
    start: H(9, 0),
    end: H(10, 0),
    flexibility: "flexible",
    priority: 2,
    minMinutes: 40,
    energy: "high",
    location: "Gym",
    detail: "Progressive overload. Track exercises, sets, reps, weight. Protein and hydration after.",
    cue: "Gym time — progressive overload",
  },
  {
    key: "breakfast",
    title: "Breakfast & Recovery",
    pillar: "Body",
    kind: "meal",
    start: H(10, 0),
    end: H(10, 25),
    flexibility: "flexible",
    priority: 3,
    minMinutes: 15,
    energy: "low",
    detail: "High-protein meal. Hydrate. Quick reset before the drive.",
    notify: false,
  },
  {
    key: "commute-in",
    title: "Commute to Office",
    pillar: "Mind",
    kind: "travel",
    start: H(10, 25),
    end: H(11, 5),
    flexibility: "protected",
    priority: 1,
    minMinutes: COMMUTE.minMinutes,
    prefMinutes: COMMUTE.planWith,
    energy: "low",
    rotates: "commute",
    detail: "University on wheels — podcast, audiobook, AI lesson, trading or business education.",
    cue: "Time to head to the office",
  },
  {
    key: "dryp",
    title: "DRYP Builder Block",
    pillar: "Money",
    pillar2: "Mission",
    identity: "Builder",
    kind: "work",
    start: H(11, 5),
    end: H(17, 30),
    flexibility: "protected",
    priority: 1,
    energy: "high",
    location: "Office",
    detail:
      "Top three outcomes first. Meetings, deep-work windows, admin windows, follow-ups — tasks ranked by importance and deadline.",
    cue: "Builder block — your top three outcomes",
  },
  {
    key: "commute-home",
    title: "Commute Home",
    pillar: "Spirit",
    pillar2: "Mind",
    kind: "travel",
    start: H(17, 30),
    end: H(18, 10),
    flexibility: "protected",
    priority: 2,
    minMinutes: COMMUTE.minMinutes,
    prefMinutes: COMMUTE.planWith,
    energy: "low",
    detail:
      "No new input. Reflect, voice journal, capture lessons and loose ends. Close DRYP mentally before you walk in the door.",
    cue: "Heading home — voice journal the day",
  },

  // ---- sun-anchored evening (laid out by the engine around the Horizon Walk) ----
  {
    key: "horizon",
    title: "Horizon Walk",
    pillar: "Spirit",
    pillar2: "Body",
    kind: "horizon",
    start: H(19, 30), // placeholder — always recomputed from real sun times
    end: H(20, 15),
    flexibility: "flexible",
    priority: 2,
    minMinutes: HORIZON.minMinutes,
    prefMinutes: HORIZON.defaultMinutes,
    energy: "low",
    location: "Beach",
    travelMinutes: HORIZON.travelMinutes,
    sunAnchored: "either",
    detail: "Beach at the horizon. Silence, walking meditation, gratitude, voice journal, or simply watch.",
    cue: "Horizon Walk — the light is right",
  },
  {
    key: "dinner",
    title: "Dinner",
    pillar: "Body",
    kind: "meal",
    start: H(20, 15),
    end: H(20, 45),
    flexibility: "flexible",
    // Eating is not optional work. On a short evening this outranks the
    // Freedom Block and Content Studio.
    priority: 2,
    minMinutes: 20,
    prefMinutes: 30,
    energy: "low",
    detail: "Slow down. Eat well. Protein.",
    notify: false,
  },
  {
    key: "freedom",
    title: "Freedom Block",
    pillar: "Mission",
    kind: "work",
    start: H(20, 45),
    end: H(21, 45),
    flexibility: "flexible",
    priority: 3,
    minMinutes: 45,
    prefMinutes: 60,
    energy: "medium",
    rotates: "freedom",
    detail:
      "Assets only — KalebOS, MT4 bot, TikTok Shop automation, e-commerce systems, new AI products. The highest-leverage thing you own.",
    cue: "Freedom Block — build the asset",
  },
  {
    key: "content",
    title: "Content Studio",
    pillar: "Mission",
    kind: "work",
    start: H(21, 45),
    end: H(22, 45),
    flexibility: "flexible",
    // Last in, first deferred — content batches well, so a missed evening is
    // recoverable in a way sleep and food are not.
    priority: 4,
    minMinutes: 45,
    prefMinutes: 60,
    energy: "medium",
    rotates: "content",
    detail:
      "Script, record, edit, post, respond, review analytics, organize footage. Turn today's journal insights into content.",
    cue: "Content Studio — ship something",
  },
  {
    key: "meditation-pm",
    title: "Evening Meditation",
    pillar: "Spirit",
    kind: "ritual",
    start: H(22, 45),
    end: H(23, 0),
    flexibility: "flexible",
    priority: 2,
    minMinutes: 10,
    prefMinutes: 20,
    energy: "low",
    detail: "Release the day. Become still.",
    cue: "Evening meditation — release the day",
  },
  {
    key: "journal-pm",
    title: "Evening Journal",
    pillar: "Spirit",
    kind: "journal",
    start: H(23, 0),
    end: H(23, 15),
    flexibility: "flexible",
    priority: 2,
    minMinutes: 10,
    prefMinutes: 15,
    energy: "low",
    detail:
      "What did I build? What challenged me? What am I grateful for? Did I live by my values? Who did I become today? What must happen tomorrow?",
    cue: "Evening journal — who did you become today?",
  },
  {
    key: "sleep",
    title: "Sleep",
    pillar: "Body",
    kind: "sleep",
    start: SLEEP.targetSleepMin,
    end: H(24, 0),
    flexibility: "protected",
    priority: 1,
    // No minMinutes here: sleep runs across midnight, so its duration isn't
    // expressible as end-minus-start on a single day. The eight-hour floor is
    // enforced by the engine against SLEEP.minHours / latestSleepMin instead.
    energy: "low",
    detail: "Eight hours, protected. Tomorrow is built here.",
    cue: "Wind down — sleep target is 9:45",
  },
];

/** Pull a weekday block by key so the weekend templates never depend on array order. */
const wd = (key: string): TemplateBlock => {
  const b = WEEKDAY.find((x) => x.key === key);
  if (!b) throw new Error(`rhythm template: no weekday block "${key}"`);
  return { ...b };
};

const SATURDAY: TemplateBlock[] = [
  { ...wd("wake"), start: H(7, 0), end: H(7, 15), detail: "Within an hour of the weekday wake. Water. Hygiene. Open KalebOS." },
  { ...wd("meditation-am"), start: H(7, 15), end: H(7, 40) },
  { ...wd("journal-am"), start: H(7, 40), end: H(8, 0) },
  {
    key: "trading-review",
    title: "Trading Review & Backtest",
    pillar: "Money",
    identity: "Trader",
    kind: "work",
    start: H(8, 0),
    end: H(10, 0),
    flexibility: "flexible",
    priority: 2,
    minMinutes: 60,
    energy: "high",
    detail: "Review the week's trades, backtest, refine rules. Trade live only if the session qualifies.",
    cue: "Trading review — grade your week",
  },
  { ...wd("gym"), start: H(10, 0), end: H(11, 15), minMinutes: 45 },
  { ...wd("breakfast"), start: H(11, 15), end: H(11, 45) },
  {
    key: "creative",
    title: "Long-Form Content & Filming",
    pillar: "Mission",
    kind: "work",
    start: H(12, 30),
    end: H(16, 0),
    flexibility: "flexible",
    priority: 2,
    minMinutes: 90,
    energy: "high",
    detail: "Long-form YouTube, filming, batching, personal projects.",
    cue: "Creative block — film and build",
  },
  wd("horizon"),
  {
    key: "relationships",
    title: "People & Florida",
    pillar: "Relationships",
    kind: "work",
    start: H(18, 30),
    end: H(21, 30),
    flexibility: "movable",
    priority: 3,
    minMinutes: 60,
    energy: "medium",
    detail: "Friends, family, networking, dates, Florida experiences. Flexible evening recreation.",
    cue: "Go be with people",
  },
  { ...wd("meditation-pm"), start: H(22, 0), end: H(22, 15) },
  { ...wd("journal-pm"), start: H(22, 15), end: H(22, 30) },
  { ...wd("sleep"), start: H(22, 30), end: H(24, 0) },
];

const SUNDAY: TemplateBlock[] = [
  { ...wd("wake"), start: H(7, 0), end: H(7, 15) },
  { ...wd("meditation-am"), start: H(7, 15), end: H(7, 40) },
  { ...wd("journal-am"), start: H(7, 40), end: H(8, 0) },
  { ...wd("gym"), title: "Gym or Recovery", start: H(9, 0), end: H(10, 0), minMinutes: 30, detail: "Lift, or mobility and recovery. Your call — movement either way." },
  { ...wd("breakfast"), start: H(10, 0), end: H(10, 30) },
  {
    key: "weekly-review",
    title: "Weekly Review",
    pillar: "Mind",
    kind: "work",
    start: H(11, 0),
    end: H(13, 0),
    flexibility: "flexible",
    priority: 1,
    minMinutes: 45,
    energy: "high",
    detail:
      "Trading, DRYP, finances, content analytics, weight and fitness, journal synthesis, alignment by pillar. Then plan the week.",
    cue: "Weekly review — look at the whole picture",
  },
  {
    key: "reset",
    title: "Reset & Prep",
    pillar: "Body",
    kind: "work",
    start: H(13, 30),
    end: H(16, 30),
    flexibility: "movable",
    priority: 3,
    minMinutes: 60,
    energy: "medium",
    detail: "Apartment, laundry, groceries, meal prep. Set next week up to run with zero friction.",
    cue: "Reset day — set next week up",
  },
  wd("horizon"),
  {
    key: "plan-week",
    title: "Plan the Week",
    pillar: "Mission",
    kind: "work",
    start: H(19, 30),
    end: H(20, 15),
    flexibility: "flexible",
    priority: 2,
    minMinutes: 25,
    energy: "medium",
    detail: "Calendar, top outcomes, deadlines, meetings. Decide the week before it decides you.",
    cue: "Plan the week ahead",
  },
  { ...wd("meditation-pm"), start: H(21, 15), end: H(21, 30) },
  { ...wd("journal-pm"), start: H(21, 30), end: H(21, 45) },
  { ...wd("sleep"), start: SLEEP.targetSleepMin, end: H(24, 0) },
];

export const TEMPLATES: Record<DayType, TemplateBlock[]> = {
  weekday: WEEKDAY,
  saturday: SATURDAY,
  sunday: SUNDAY,
};

export function dayTypeOf(dow: number): DayType {
  if (dow === 0) return "sunday";
  if (dow === 6) return "saturday";
  return "weekday";
}

export function templateFor(dayType: DayType): TemplateBlock[] {
  return TEMPLATES[dayType].map((b) => ({ ...b }));
}
