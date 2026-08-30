// The default rhythm — Kaleb's law, as data.
//
// Times are minutes since ET midnight. The morning through commute-home is
// clock-anchored (real obligations: markets open, the office exists). Everything
// after the commute home is *sun-anchored*: the engine lays the evening out
// around the Horizon Walk, because sunset moves ~2 hours across the year and
// hardcoding 6:00 PM would break the ritual half the year.

import type { DayType, TemplateBlock } from "./types";

export const H = (h: number, m = 0) => h * 60 + m;

/** Sleep target: exactly eight hours. Lights out 10:00 PM, wake 6:00 AM. */
export const SLEEP = {
  wakeMin: H(6, 0),
  targetSleepMin: H(22, 0),
  latestSleepMin: H(22, 30),
  minHours: 8,
};

/** Commute is configurable 30–45 min; we plan with 45 so lateness is impossible.
 *  Target departure is 9:15 AM, arriving for a 10:00 office start. */
export const COMMUTE = { minMinutes: 30, maxMinutes: 45, planWith: 45 };

/**
 * Gym policy, by real weekday (0 = Sunday).
 *
 * Wednesday and Sunday are rest *by design*. They are removed from the day
 * entirely rather than left to be missed, so a rest day cannot cost him a
 * point of consistency — the denominator shrinks with the day.
 */
export const GYM = {
  /** Non-negotiable training days. */
  mandatory: [1, 2, 4, 5] as number[], // Mon, Tue, Thu, Fri
  /** Optional — offered, never graded. */
  optional: [6] as number[], // Saturday
  /** Rest. No gym block is generated at all. */
  rest: [0, 3] as number[], // Sunday, Wednesday
  /** The window the block floats inside on an office day. */
  windowStart: H(11, 30),
  windowEnd: H(15, 0),
  minMinutes: 60,
  prefMinutes: 75,
};

export type GymStatus = "mandatory" | "optional" | "rest";

export function gymStatusFor(dow: number): GymStatus {
  if (GYM.rest.includes(dow)) return "rest";
  if (GYM.optional.includes(dow)) return "optional";
  return "mandatory";
}

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
    pillar: "Mind",
    kind: "ritual",
    start: H(6, 10),
    end: H(6, 35),
    flexibility: "flexible",
    priority: 2,
    minMinutes: 10,
    energy: "low",
    detail: "Silence. Presence. Mental alignment before the day asks anything of you.",
    cue: "Time to sit — 20 minutes of silence",
  },
  {
    key: "journal-am",
    title: "Journal · Walk · Water",
    pillar: "Mind",
    kind: "journal",
    start: H(6, 35),
    end: H(7, 0),
    flexibility: "flexible",
    priority: 2,
    minMinutes: 10,
    energy: "medium",
    detail:
      "Optional journaling, outdoor time, water. Who am I choosing to be today? The three most important outcomes? Slow, intentional preparation — the day does not start in a rush.",
    cue: "Morning reset — journal, walk, water",
  },
  {
    key: "trading",
    title: "Trading Session",
    pillar: "Trading",
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
    key: "get-ready",
    title: "Get Ready",
    pillar: "Body",
    kind: "ritual",
    start: H(9, 0),
    end: H(9, 15),
    flexibility: "flexible",
    priority: 2,
    minMinutes: 10,
    energy: "low",
    detail: "Shower, dress, protein, out the door. Target departure 9:15.",
    cue: "Get ready — wheels up at 9:15",
  },
  {
    key: "commute-in",
    title: "Commute to Office",
    pillar: "Mind",
    kind: "travel",
    start: H(9, 15),
    end: H(10, 0),
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
    pillar: "DRYP",
    pillar2: "Brand",
    identity: "Builder",
    kind: "work",
    start: H(10, 0),
    end: H(18, 0),
    flexibility: "protected",
    priority: 1,
    energy: "high",
    location: "Office",
    detail:
      "CEO, Builder, Management, Admin. Top three outcomes first — high-leverage work before anything that could eventually be delegated.",
    cue: "Builder block — your top three outcomes",
  },
  {
    // Floats inside the office day. The engine places it wherever meetings
    // permit between 11:30 and 3:00; on rest days it is never generated.
    key: "gym",
    title: "Gym",
    pillar: "Body",
    kind: "training",
    start: GYM.windowStart,
    end: GYM.windowStart + GYM.prefMinutes,
    flexibility: "flexible",
    priority: 2,
    minMinutes: GYM.minMinutes,
    prefMinutes: GYM.prefMinutes,
    energy: "high",
    location: "Gym",
    containedIn: "dryp",
    detail:
      "Progressive overload. Track exercises, sets, reps, weight. Protein and hydration after. Anywhere between 11:30 and 3:00 that meetings allow.",
    cue: "Gym time — progressive overload",
  },
  {
    key: "commute-home",
    title: "Commute Home",
    pillar: "Mind",
    kind: "travel",
    start: H(18, 0),
    end: H(19, 0),
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
    pillar: "Mind",
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
    start: H(19, 15),
    end: H(19, 45),
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
    pillar: "Brand",
    kind: "work",
    start: H(19, 45),
    end: H(21, 0),
    flexibility: "flexible",
    priority: 3,
    minMinutes: 30,
    prefMinutes: 75,
    energy: "medium",
    rotates: "freedom",
    detail:
      "Assets only — KalebOS, MT4 bot, TikTok Shop automation, e-commerce systems, new AI products. The highest-leverage thing you own.",
    cue: "Freedom Block — build the asset",
  },
  {
    key: "content",
    title: "Post & Engage",
    pillar: "Brand",
    kind: "work",
    start: H(21, 0),
    end: H(21, 30),
    flexibility: "flexible",
    // Recording moved to Saturday's batch, so the weekday job is small: the two
    // posts are already scheduled — this is publishing, replying and capturing
    // tomorrow's ideas. Last in, first deferred: a missed evening is recoverable
    // in a way sleep and food are not.
    priority: 4,
    minMinutes: 15,
    prefMinutes: 30,
    energy: "medium",
    rotates: "content",
    detail:
      "The two posts are already scheduled. Reply to comments, check yesterday's numbers, capture anything today gave you worth saying.",
    cue: "Post & engage — distribution compounds",
  },
  {
    key: "meditation-pm",
    title: "Shutdown + Evening Meditation",
    pillar: "Mind",
    kind: "ritual",
    start: H(21, 30),
    end: H(21, 50),
    flexibility: "protected",
    priority: 1,
    minMinutes: 10,
    prefMinutes: 20,
    energy: "low",
    detail: "Close the laptop. Close the day. Release it. Become still.",
    cue: "Shutdown — release the day",
  },
  {
    key: "journal-pm",
    title: "Evening Journal",
    pillar: "Mind",
    kind: "journal",
    start: H(21, 50),
    end: H(22, 0),
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
    cue: "Lights out — eight hours to a 6:00 wake",
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
  { ...wd("meditation-am"), start: H(7, 15), end: H(7, 45) },
  { ...wd("journal-am"), start: H(7, 45), end: H(8, 15) },
  {
    key: "breakfast",
    title: "Breakfast",
    pillar: "Body",
    kind: "meal",
    start: H(8, 15),
    end: H(8, 45),
    flexibility: "flexible",
    priority: 3,
    minMinutes: 15,
    energy: "low",
    detail: "High-protein meal. Hydrate.",
    notify: false,
  },
  {
    // The week's distribution is won or lost here. Twenty-eight ideas in,
    // fourteen scheduled videos out.
    key: "content-batch",
    title: "Content Batch",
    pillar: "Brand",
    kind: "work",
    start: H(9, 0),
    end: H(12, 30),
    flexibility: "flexible",
    priority: 1,
    minMinutes: 120,
    prefMinutes: 210,
    energy: "high",
    detail:
      "Generate 28 ideas, select 14, record 14, edit lightly, schedule two a day across the week. Talking head is the default — do not overcomplicate the format.",
    cue: "Content batch — 28 ideas, pick 14, record",
  },
  {
    key: "gym",
    title: "Gym (optional)",
    pillar: "Body",
    kind: "training",
    start: H(13, 0),
    end: H(14, 15),
    flexibility: "movable",
    priority: 4,
    minMinutes: 45,
    energy: "high",
    location: "Gym",
    detail: "Optional. Train if the body wants it — this one is offered, never graded.",
    cue: "Gym if you want it — optional today",
  },
  {
    key: "saturday-open",
    title: "Open",
    pillar: "Relationships",
    kind: "work",
    start: H(14, 30),
    end: H(19, 0),
    flexibility: "movable",
    priority: 4,
    minMinutes: 60,
    energy: "medium",
    detail: "Yours. Friends, family, Florida, filming, exploring, rest — whatever the week left undone.",
    cue: "The rest of Saturday is yours",
  },
  wd("horizon"),
  { ...wd("meditation-pm"), start: H(22, 0), end: H(22, 20), flexibility: "flexible", priority: 2 },
  { ...wd("journal-pm"), start: H(22, 20), end: H(22, 30) },
  { ...wd("sleep"), start: H(22, 30), end: H(24, 0) },
];

const SUNDAY: TemplateBlock[] = [
  { ...wd("wake"), start: H(7, 0), end: H(7, 15) },
  { ...wd("meditation-am"), start: H(7, 15), end: H(7, 45) },
  { ...wd("journal-am"), start: H(7, 45), end: H(8, 15) },
  {
    key: "breakfast",
    title: "Breakfast",
    pillar: "Body",
    kind: "meal",
    start: H(8, 15),
    end: H(8, 45),
    flexibility: "flexible",
    priority: 3,
    minMinutes: 15,
    energy: "low",
    detail: "High-protein meal. Hydrate.",
    notify: false,
  },
  {
    key: "reset",
    title: "Weekly Reset",
    pillar: "Body",
    kind: "work",
    start: H(9, 30),
    end: H(13, 0),
    flexibility: "flexible",
    priority: 1,
    minMinutes: 90,
    energy: "medium",
    detail:
      "Groceries. Meal prep. Laundry. Gym bag replenished. Clothes prepared. Set next week up to run with zero friction.",
    cue: "Reset day — groceries, meal prep, laundry, gym bag",
  },
  {
    key: "weekly-review",
    title: "Weekly Review",
    pillar: "Mind",
    kind: "work",
    start: H(14, 0),
    end: H(16, 0),
    flexibility: "flexible",
    priority: 1,
    minMinutes: 45,
    energy: "high",
    detail:
      "Calendar review. DRYP priorities. Trading preparation. Content review. Body and nutrition trends. Then the only question that matters: what are the three things that would make next week a win?",
    cue: "Weekly review — what would make next week a win?",
  },
  wd("horizon"),
  {
    key: "sunday-rest",
    title: "Rest",
    pillar: "Relationships",
    kind: "ritual",
    start: H(18, 30),
    end: H(21, 30),
    flexibility: "movable",
    priority: 4,
    minMinutes: 60,
    energy: "low",
    detail: "Full rest day. No gym, no obligation. Start Monday with zero friction.",
    cue: "Rest — you built the week already",
  },
  { ...wd("meditation-pm"), start: H(21, 30), end: H(21, 50) },
  { ...wd("journal-pm"), start: H(21, 50), end: H(22, 0) },
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

/**
 * The blocks for a day.
 *
 * Pass `dow` (0 = Sunday) to apply weekday policy — chiefly the gym, which is
 * mandatory Mon/Tue/Thu/Fri, optional Saturday, and *absent* on Wednesday and
 * Sunday. Dropping it rather than leaving it to be missed is deliberate: a rest
 * day must not be able to cost a point of consistency, so it leaves the
 * denominator too.
 *
 * Without `dow` you get the unfiltered template — useful for previewing a day
 * type, but never for scoring a real date.
 */
export function templateFor(dayType: DayType, dow?: number): TemplateBlock[] {
  let blocks = TEMPLATES[dayType].map((b) => ({ ...b }));
  if (dow !== undefined && gymStatusFor(dow) === "rest") {
    blocks = blocks.filter((b) => b.key !== "gym");
  }
  return blocks;
}

/** The blocks for a real ET date, with weekday policy applied. */
export function templateForDate(dateStr: string): TemplateBlock[] {
  const dow = new Date(`${dateStr}T12:00:00Z`).getUTCDay();
  return templateFor(dayTypeOf(dow), dow);
}
