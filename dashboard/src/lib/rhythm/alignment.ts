// Alignment scoring.
//
// Deliberately *not* one blended number: a single score hides which pillar is
// starving. We report the overall figure, per-pillar detail, and a confidence
// level driven by how much of the day has actually elapsed and been logged —
// so a 9 AM "12%" doesn't read as failure.

import { PILLARS, toPillar } from "./pillars";
import type { PlannedBlock } from "./types";

export type Alignment = {
  overall: number;
  byPillar: Record<string, { done: number; of: number }>;
  confidence: "low" | "medium" | "high";
  loggedShare: number;
};

export function scoreDay(blocks: PlannedBlock[], nowMin: number): Alignment {
  // Only blocks whose window has already passed can be judged. Sleep is
  // excluded — it's measured by duration, not by a check-off.
  const gradable = blocks.filter((b) => b.kind !== "sleep" && b.status !== "skipped");
  const elapsed = gradable.filter((b) => b.end <= nowMin);

  const byPillar: Record<string, { done: number; of: number }> = {};
  for (const p of PILLARS) byPillar[p] = { done: 0, of: 0 };

  for (const b of elapsed) {
    const pillars = [toPillar(b.pillar), ...(b.pillar2 ? [toPillar(b.pillar2)] : [])];
    for (const p of pillars) {
      byPillar[p].of += 1;
      if (b.status === "done") byPillar[p].done += 1;
    }
  }

  const done = elapsed.filter((b) => b.status === "done").length;
  const overall = elapsed.length === 0 ? 0 : Math.round((done / elapsed.length) * 100);
  const loggedShare = gradable.length === 0 ? 0 : elapsed.length / gradable.length;

  return {
    overall,
    byPillar,
    loggedShare: Math.round(loggedShare * 100) / 100,
    confidence: loggedShare < 0.25 ? "low" : loggedShare < 0.6 ? "medium" : "high",
  };
}
