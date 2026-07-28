// Notifications that earn their interruption.
//
// Every one explains *why* it matters, in Kaleb's own terms:
//   "Sunset is at 8:17 PM. Leave by 7:42 PM to complete today's Horizon Walk
//    without affecting your 10:00 PM sleep target."
//
// Quiet hours are respected, and each notification fires at most once a day.

import { fmtMin } from "./engine";
import { SLEEP } from "./template";
import type { ResolvedDay } from "./day";
import type { PlannedBlock } from "./types";

export type Notice = {
  /** Dedup key — one per day. */
  id: string;
  title: string;
  body: string;
  url: string;
  tag: string;
};

/** Outside these ET hours we stay silent, whatever is due. */
export const QUIET_HOURS = { from: 22 * 60 + 30, to: 5 * 60 + 30 };

export function inQuietHours(nowMin: number): boolean {
  return nowMin >= QUIET_HOURS.from || nowMin < QUIET_HOURS.to;
}

const PILLAR_EMOJI: Record<string, string> = {
  Spirit: "🧘", Mind: "🧠", Body: "💪", Money: "💰", Mission: "🚀", Relationships: "🤝",
};

/** How close to a moment counts as "now" — tolerates an infrequent cron. */
const WINDOW = 16;
const due = (nowMin: number, at: number) => nowMin >= at && nowMin < at + WINDOW;

/**
 * Everything that deserves a push right now, given the resolved day.
 * Pure: the caller decides how to send and how to dedup.
 */
export function noticesFor(day: ResolvedDay, nowMin: number): Notice[] {
  if (inQuietHours(nowMin)) return [];
  const out: Notice[] = [];
  const dateTag = day.dateStr;

  for (const b of day.blocks) {
    if (b.status === "skipped" || b.status === "done") continue;

    // Departure warning — travel is the thing that actually makes you late.
    const travel = b.travelMinutes ?? 0;
    if (travel > 0 && due(nowMin, b.start - travel)) {
      out.push({
        id: `leave:${b.key}:${dateTag}`,
        title: `🚗 Leave now — ${b.title}`,
        body: `${travel} minutes of travel. ${b.title} starts at ${fmtMin(b.start)}.`,
        url: "/schedule",
        tag: "travel",
      });
    }

    // The block itself.
    if (due(nowMin, b.start)) {
      out.push({
        id: `block:${b.key}:${dateTag}`,
        title: `${PILLAR_EMOJI[b.pillar] ?? "⏱️"} ${b.cue ?? b.title}`,
        body: whyItMatters(b, day),
        url: b.kind === "journal" ? "/journal" : "/",
        tag: "schedule",
      });
    }

    // Transition warning five minutes out, for the demanding blocks only.
    if (b.flexibility === "protected" && b.energy === "high" && due(nowMin, b.start - 5)) {
      out.push({
        id: `soon:${b.key}:${dateTag}`,
        title: `⏳ ${b.title} in 5`,
        body: `Close what you're doing. ${b.title} runs ${fmtMin(b.start)}–${fmtMin(b.end)}.`,
        url: "/",
        tag: "transition",
      });
    }
  }

  // Horizon Walk — the one notification that has to be sun-aware.
  const horizon = day.horizon.block;
  if (horizon && !day.horizon.doneToday) {
    const travel = horizon.travelMinutes ?? 0;
    const leaveAt = horizon.start - travel;
    if (due(nowMin, leaveAt)) {
      const sunLabel = horizon.start < 12 * 60 ? "Sunrise" : "Sunset";
      const sunMin = horizon.start < 12 * 60 ? day.sun.sunriseMin : day.sun.sunsetMin;
      out.push({
        id: `horizon:${dateTag}`,
        title: "🌅 Horizon Walk",
        body: `${sunLabel} is at ${fmtMin(sunMin)}. Leave by ${fmtMin(leaveAt)} to complete today's walk without affecting your ${fmtMin(SLEEP.targetSleepMin)} sleep target.`,
        url: "/",
        tag: "horizon",
      });
    }
  }

  // Weekly minimum at risk — once, mid-afternoon, only when it's actionable.
  const week = day.horizon.week;
  if (!day.horizon.doneToday && week.atRisk && !week.minimumImpossible && due(nowMin, 15 * 60)) {
    out.push({
      id: `horizon-risk:${dateTag}`,
      title: "🌅 Five-of-seven at risk",
      body: `${week.done} walks so far. Every one of the ${week.daysLeft} days left has to count to hold your floor.`,
      url: "/",
      tag: "horizon",
    });
  }

  // Wind-down — protecting eight hours starts 30 minutes before lights out.
  if (due(nowMin, SLEEP.targetSleepMin - 30)) {
    out.push({
      id: `winddown:${dateTag}`,
      title: "🌙 Wind down",
      body: `Sleep target is ${fmtMin(SLEEP.targetSleepMin)}. That's your eight hours before a ${fmtMin(SLEEP.wakeMin)} wake.`,
      url: "/journal",
      tag: "sleep",
    });
  }

  // Conflicts need a decision, not a silent reshuffle.
  if (day.conflicts.length > 0 && due(nowMin, 8 * 60)) {
    out.push({
      id: `conflict:${dateTag}`,
      title: "⚠️ Schedule conflict",
      body: `${day.conflicts.length} overlap${day.conflicts.length > 1 ? "s" : ""} today. Open Schedule to rebalance — nothing moves until you approve it.`,
      url: "/schedule?rebalance=1",
      tag: "conflict",
    });
  }

  return out;
}

function whyItMatters(b: PlannedBlock, day: ResolvedDay): string {
  const bits: string[] = [];
  if (b.theme) bits.push(`Today: ${b.theme}.`);
  if (b.detail) bits.push(b.detail);
  if (b.flexibility === "protected") bits.push("This one is protected.");
  if (b.key === "trading") {
    bits.push(`Two hours. ${fmtMin(b.start)}–${fmtMin(b.end)}.`);
  }
  if (b.kind === "sleep") {
    bits.push(`Eight hours before your ${fmtMin(SLEEP.wakeMin)} wake.`);
  }
  void day;
  return bits.join(" ").slice(0, 300);
}
