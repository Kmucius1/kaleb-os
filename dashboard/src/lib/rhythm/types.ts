// Shared vocabulary for the rhythm engine.
//
// Two distinct things, deliberately kept apart (they used to be one table):
//
//   TemplateBlock  — the recurring *intent* ("weekdays, 7–9am is Trading").
//                    Lives in code (this repo) + projected into schedule_blocks
//                    for the notification cron.
//   PlannedBlock   — a *dated instance* of that intent, for one real day, which
//                    the adaptive engine is free to move, shorten, lock, skip or
//                    complete without ever touching the template.

import type { Pillar } from "./pillars";

/** How willing the engine is to move something when the day changes. */
export type Flexibility =
  | "protected" // sleep, trading, important meetings, health, critical deadlines
  | "flexible" // gym, Horizon Walk, content, study, freedom block
  | "movable"; // admin, optional research, low-priority errands

export type Energy = "high" | "medium" | "low";

export type BlockKind =
  | "ritual"
  | "work"
  | "training"
  | "meal"
  | "travel"
  | "sleep"
  | "horizon"
  | "journal"
  | "event";

export type TemplateBlock = {
  /** Stable slug — the identity that survives reschedules and reseeds. */
  key: string;
  title: string;
  pillar: Pillar;
  /** Secondary pillar, when a block genuinely serves two (e.g. DRYP = Money + Mission). */
  pillar2?: Pillar;
  identity?: string;
  kind: BlockKind;
  /** Minutes since ET midnight. */
  start: number;
  end: number;
  flexibility: Flexibility;
  /** 1 = highest. Used to decide what survives a squeeze. */
  priority: number;
  /** Engine will never shorten below this. Defaults to the full duration. */
  minMinutes?: number;
  /** What Kaleb actually wants when the day allows it. Defaults to full duration. */
  prefMinutes?: number;
  energy: Energy;
  location?: string;
  /** Travel needed *before* this block starts. */
  travelMinutes?: number;
  detail?: string;
  /** Spoken-style notification headline. */
  cue?: string;
  /** Rotation family — theme resolved per weekday from config. */
  rotates?: "commute" | "study" | "content" | "freedom";
  /** Today's resolved rotation ("AI Podcast", "Trading Psychology", …). */
  theme?: string | null;
  notify?: boolean;
  /** Anchored to the sun rather than the clock (the Horizon Walk). */
  sunAnchored?: "sunrise" | "sunset" | "either";
};

export type DayType = "weekday" | "saturday" | "sunday";

/** A dated, movable instance. */
export type PlannedBlock = TemplateBlock & {
  /** ET calendar date, YYYY-MM-DD. */
  date: string;
  status: "planned" | "current" | "done" | "skipped" | "missed";
  /** True once Kaleb pins it — the engine then treats it as protected. */
  locked?: boolean;
  /** Set when the engine moved it, so the UI can explain the change. */
  movedFrom?: { start: number; end: number };
  reason?: string;
};

export type Conflict = {
  a: string; // block key
  b: string;
  overlapMinutes: number;
};

/** What "Rebalance My Day" hands back for approval — never auto-applied. */
export type RebalanceProposal = {
  blocks: PlannedBlock[];
  changes: {
    key: string;
    title: string;
    kind: "moved" | "shortened" | "skipped" | "kept";
    from?: { start: number; end: number };
    to?: { start: number; end: number };
    why: string;
  }[];
  /** Plain-language summary shown on the approval card. */
  summary: string;
  warnings: string[];
};
