// The adaptive scheduling engine.
//
// Pure functions only — every input is passed in (sun times, events, "now"),
// so the whole thing is deterministic and testable. Nothing here touches the
// network, the DB, or the system clock.
//
// Guarantees, in priority order:
//   1. Sleep keeps its eight hours and the wake time never drifts.
//   2. Protected blocks (trading, DRYP, meetings, travel) are never moved
//      silently — only reported as conflicts for Kaleb to resolve.
//   3. The Horizon Walk survives; it moves to the other end of the day before
//      it gets dropped.
//   4. Flexible blocks slide and shorten — but never below minMinutes.
//   5. Nothing is deleted. Anything that genuinely cannot fit is marked
//      skipped with a reason, so it can carry into tomorrow.

import { SLEEP, templateFor, dayTypeOf } from "./template";
import { planHorizonWalk, type SunTimes, type HorizonChoice } from "./sun";
import type { Conflict, DayType, PlannedBlock, RebalanceProposal, TemplateBlock } from "./types";

export const durationOf = (b: { start: number; end: number }) => b.end - b.start;
const pref = (b: TemplateBlock) => b.prefMinutes ?? durationOf(b);
const floor = (b: TemplateBlock) => b.minMinutes ?? durationOf(b);
const byStart = (a: { start: number }, b: { start: number }) => a.start - b.start;

export function dowOfDateStr(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00Z`).getUTCDay();
}

/** Do two spans overlap? Touching endpoints (10:00 end, 10:00 start) do not. */
export const overlaps = (a: { start: number; end: number }, b: { start: number; end: number }) =>
  a.start < b.end && b.start < a.end;

export function findConflicts(blocks: { key: string; start: number; end: number }[]): Conflict[] {
  const sorted = [...blocks].sort(byStart);
  const out: Conflict[] = [];
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j].start >= sorted[i].end) break;
      out.push({
        a: sorted[i].key,
        b: sorted[j].key,
        overlapMinutes: Math.min(sorted[i].end, sorted[j].end) - Math.max(sorted[i].start, sorted[j].start),
      });
    }
  }
  return out;
}

export type MaterializeInput = {
  dateStr: string;
  sun: SunTimes;
  /** Dated one-off events (meetings, appointments) already on the calendar. */
  events?: { id: string; title: string; start_min: number | null; end_min: number | null; pillar?: string | null; location?: string | null }[];
  horizonPreference?: HorizonChoice;
  horizonMinutes?: number;
  horizonTravelMinutes?: number;
  /** Keys already checked off today. */
  completed?: string[];
  /** Keys Kaleb pinned. */
  locked?: string[];
  /** Per-day overrides previously approved (from a rebalance). */
  overrides?: Record<string, { start: number; end: number; status?: PlannedBlock["status"] }>;
};

/**
 * Build the dated plan for one day: template → sun-anchored evening → events →
 * overrides. This never mutates the template.
 */
export function materializeDay(input: MaterializeInput): {
  dateStr: string;
  dayType: DayType;
  blocks: PlannedBlock[];
  conflicts: Conflict[];
} {
  const dayType = dayTypeOf(dowOfDateStr(input.dateStr));
  const tpl = templateFor(dayType);
  const completed = new Set(input.completed ?? []);
  const lockedKeys = new Set(input.locked ?? []);

  const clockAnchored = tpl.filter((b) => !b.sunAnchored && !isEvening(b.key));
  const evening = tpl.filter((b) => b.sunAnchored || isEvening(b.key));

  // 1) Place the Horizon Walk against the real sun and today's protected work.
  const horizonTpl = tpl.find((b) => b.key === "horizon");
  let horizonPlan = null as ReturnType<typeof planHorizonWalk> | null;
  if (horizonTpl) {
    horizonPlan = planHorizonWalk({
      sun: input.sun,
      busy: clockAnchored.map((b) => ({ start: b.start, end: b.end, flexibility: b.flexibility, title: b.title })),
      preference: input.horizonPreference,
      durationMinutes: input.horizonMinutes ?? pref(horizonTpl),
      travelMinutes: input.horizonTravelMinutes ?? horizonTpl.travelMinutes,
      sleepTargetMin: SLEEP.targetSleepMin,
      wakeMin: SLEEP.wakeMin,
    });
  }

  // 2) Lay the rest of the evening out around it, in template order.
  const placed: TemplateBlock[] = [...clockAnchored];
  if (horizonTpl && horizonPlan) {
    placed.push({ ...horizonTpl, start: horizonPlan.start, end: horizonPlan.end, detail: horizonPlan.why });
  }

  const rest = evening.filter((b) => b.key !== "horizon" && b.key !== "sleep").sort(byStart);
  // Evening flows from whichever is later: the commute home, or the walk ending.
  const commuteHome = clockAnchored.find((b) => b.key === "commute-home");
  const cursor = Math.max(
    commuteHome?.end ?? 0,
    horizonPlan && horizonPlan.window === "sunset" ? horizonPlan.end + (horizonTpl?.travelMinutes ?? 0) : 0
  );
  const { laid, deferred } = fitEvening(rest, cursor, SLEEP.targetSleepMin);
  placed.push(...laid);
  // Deferred blocks stay visible (never deleted) so Kaleb can pull one back in
  // deliberately — or carry it to tomorrow.
  const deferredReasons = new Map(deferred.map((d) => [d.block.key, d.reason]));
  placed.push(...deferred.map((d) => ({ ...d.block, start: SLEEP.targetSleepMin, end: SLEEP.targetSleepMin })));

  // 3) Sleep last, and it never gives ground to evening work.
  const sleepTpl = tpl.find((b) => b.key === "sleep");
  if (sleepTpl) {
    const lastEnd = laid.length ? Math.max(...laid.map((b) => b.end)) : cursor;
    placed.push({ ...sleepTpl, start: Math.max(SLEEP.targetSleepMin, Math.min(lastEnd, SLEEP.latestSleepMin)), end: 24 * 60 });
  }

  // 4) Dated events become protected blocks — real commitments outrank rhythm.
  const eventBlocks: TemplateBlock[] = (input.events ?? [])
    .filter((e) => e.start_min != null)
    .map((e) => ({
      key: `event:${e.id}`,
      title: e.title,
      pillar: (e.pillar as TemplateBlock["pillar"]) ?? "Mission",
      kind: "event" as const,
      start: e.start_min!,
      end: e.end_min ?? e.start_min! + 60,
      flexibility: "protected" as const,
      priority: 1,
      energy: "medium" as const,
      location: e.location ?? undefined,
    }));

  const blocks: PlannedBlock[] = [...placed, ...eventBlocks].sort(byStart).map((b) => {
    const ov = input.overrides?.[b.key];
    const start = ov?.start ?? b.start;
    const end = ov?.end ?? b.end;
    const deferredReason = deferredReasons.get(b.key);
    // Only claim a block moved when it actually landed somewhere else — an
    // override that matches the template is a no-op, not a change.
    const actuallyMoved = ov != null && (ov.start !== b.start || ov.end !== b.end);
    return {
      ...b,
      date: input.dateStr,
      start,
      end,
      locked: lockedKeys.has(b.key),
      status: ov?.status ?? (completed.has(b.key) ? "done" : deferredReason ? "skipped" : "planned"),
      ...(deferredReason ? { reason: deferredReason } : {}),
      ...(actuallyMoved ? { movedFrom: { start: b.start, end: b.end } } : {}),
    };
  });

  return { dateStr: input.dateStr, dayType, blocks, conflicts: findConflicts(blocks) };
}

const EVENING_KEYS = new Set(["horizon", "dinner", "freedom", "content", "meditation-pm", "journal-pm", "sleep", "relationships", "plan-week"]);
const isEvening = (key: string) => EVENING_KEYS.has(key);

/**
 * Lay the evening out between the end of the Horizon Walk and the sleep target.
 *
 * A late-summer sunset genuinely leaves less evening than a winter one — that's
 * real, not a bug, and the honest answer is to shorten and then defer the
 * lowest-priority work rather than quietly eat into sleep. Blocks that don't
 * fit come back marked `deferred` with a reason, never deleted.
 */
export function fitEvening(
  blocks: TemplateBlock[],
  from: number,
  wall: number
): { laid: TemplateBlock[]; deferred: { block: TemplateBlock; reason: string }[] } {
  const ordered = [...blocks].sort(byStart);
  const available = Math.max(0, wall - from);

  // Start from everything at its preferred length, then squeeze, then drop the
  // least important (highest priority number, latest in the day breaks ties).
  const keep = new Set(ordered.map((b) => b.key));
  const deferred: { block: TemplateBlock; reason: string }[] = [];

  const total = (mode: "pref" | "min") =>
    ordered.filter((b) => keep.has(b.key)).reduce((s, b) => s + (mode === "pref" ? pref(b) : floor(b)), 0);

  const mode: "pref" | "min" = total("pref") > available ? "min" : "pref";

  // Drop the least important thing until the survivors fit at their floors.
  while (keep.size > 0 && total(mode) > available) {
    const droppable = ordered
      .filter((b) => keep.has(b.key))
      .sort((a, b) => b.priority - a.priority || b.start - a.start)[0];
    if (!droppable) break;
    keep.delete(droppable.key);
    deferred.push({
      block: droppable,
      reason: "Didn't fit before your sleep target today — carried forward rather than cutting into sleep.",
    });
  }

  // Give leftover minutes back to the survivors, most important first, so a
  // squeezed evening isn't needlessly bare when there is room to spare.
  const lengths = new Map<string, number>();
  for (const b of ordered) if (keep.has(b.key)) lengths.set(b.key, mode === "pref" ? pref(b) : floor(b));
  let spare = available - [...lengths.values()].reduce((s, v) => s + v, 0);
  if (spare > 0) {
    for (const b of ordered.filter((x) => keep.has(x.key)).sort((a, b) => a.priority - b.priority)) {
      const room = pref(b) - (lengths.get(b.key) ?? 0);
      if (room <= 0) continue;
      const give = Math.min(room, spare);
      lengths.set(b.key, (lengths.get(b.key) ?? 0) + give);
      spare -= give;
      if (spare <= 0) break;
    }
  }

  const laid: TemplateBlock[] = [];
  let cursor = from;
  for (const b of ordered) {
    if (!keep.has(b.key)) continue;
    const dur = lengths.get(b.key) ?? floor(b);
    laid.push({ ...b, start: cursor, end: cursor + dur });
    cursor += dur;
  }
  return { laid, deferred };
}

/**
 * "Rebalance My Day" — the day slipped, work out what still fits.
 *
 * `nowMin` is the moment we're replanning from; everything before it is
 * history. `disruption` describes what actually happened, so the summary can
 * say *why* rather than just showing new times.
 */
export function rebalanceDay(opts: {
  blocks: PlannedBlock[];
  nowMin: number;
  /** Something ran long: block key + the new end time. */
  disruption?: { key: string; newEnd: number };
  sleepTargetMin?: number;
}): RebalanceProposal {
  const sleepTarget = opts.sleepTargetMin ?? SLEEP.targetSleepMin;
  const changes: RebalanceProposal["changes"] = [];
  const warnings: string[] = [];

  const blocks = opts.blocks.map((b) => ({ ...b })).sort(byStart);

  // Apply the disruption first.
  let disruptedTitle = "";
  if (opts.disruption) {
    const hit = blocks.find((b) => b.key === opts.disruption!.key);
    if (hit) {
      disruptedTitle = hit.title;
      const from = { start: hit.start, end: hit.end };
      hit.end = opts.disruption.newEnd;
      changes.push({
        key: hit.key,
        title: hit.title,
        kind: "moved",
        from,
        to: { start: hit.start, end: hit.end },
        why: `${hit.title} ran ${opts.disruption.newEnd - from.end} minutes long.`,
      });
    }
  }

  // Past and in-flight blocks are fixed points. So are protected and locked ones.
  const isFixed = (b: PlannedBlock) =>
    b.end <= opts.nowMin ||
    b.status === "done" ||
    b.locked === true ||
    b.flexibility === "protected" ||
    b.kind === "event";

  // Sleep is handled on its own at the end, so it belongs to neither list.
  const sleep = blocks.find((b) => b.kind === "sleep");
  const fixed = blocks.filter((b) => b.kind !== "sleep" && isFixed(b));
  const movable = blocks.filter((b) => b.kind !== "sleep" && !isFixed(b)).sort(byStart);

  // Walk the movable blocks forward, fitting them into the gaps left by the
  // fixed ones, shortening toward their floor rather than dropping them.
  const occupied = fixed.map((b) => ({ start: b.start, end: b.end }));
  let cursor = opts.nowMin;

  for (const b of movable) {
    const wanted = Math.max(floor(b), Math.min(pref(b), durationOf(b)));
    const min = floor(b);
    const from = { start: b.start, end: b.end };

    // Never pull a block earlier than it was planned, and never before now.
    // (Rebalancing should absorb a slip, not quietly drag the evening forward.)
    let start = Math.max(cursor, b.start);
    let slot = nextFreeSlot(start, wanted, occupied, sleepTarget);

    if (!slot) {
      // Try again at its minimum viable duration before giving up.
      slot = nextFreeSlot(start, min, occupied, sleepTarget);
      if (slot) {
        changes.push({
          key: b.key,
          title: b.title,
          kind: "shortened",
          from,
          to: { start: slot.start, end: slot.start + min },
          why: `Shortened to its ${min}-minute minimum to protect your ${fmtMin(sleepTarget)} sleep target.`,
        });
        b.start = slot.start;
        b.end = slot.start + min;
        occupied.push({ start: b.start, end: b.end });
        cursor = b.end;
        continue;
      }
      b.status = "skipped";
      b.reason = "No room left today without cutting into sleep.";
      changes.push({
        key: b.key,
        title: b.title,
        kind: "skipped",
        from,
        why: "Nothing left today that doesn't cost you sleep — carried to tomorrow.",
      });
      if (b.key === "horizon") warnings.push("Horizon Walk did not fit today — your weekly five-of-seven is at risk.");
      continue;
    }

    start = slot.start;
    const end = start + wanted;
    if (start !== from.start || end !== from.end) {
      changes.push({
        key: b.key,
        title: b.title,
        kind: "moved",
        from,
        to: { start, end },
        why: disruptedTitle ? `Shifted after ${disruptedTitle} ran long.` : "Shifted to keep the day continuous.",
      });
    } else {
      changes.push({ key: b.key, title: b.title, kind: "kept", from, to: from, why: "Unaffected." });
    }
    b.start = start;
    b.end = end;
    occupied.push({ start, end });
    cursor = end;
  }

  // Sleep never compresses to make room for lower-priority work.
  if (sleep) {
    const lastEnd = Math.max(cursor, ...fixed.map((b) => b.end), sleepTarget);
    sleep.start = Math.max(sleepTarget, Math.min(lastEnd, SLEEP.latestSleepMin));
    if (lastEnd > SLEEP.latestSleepMin) {
      warnings.push(
        `Today runs past ${fmtMin(SLEEP.latestSleepMin)} — you'll be under ${SLEEP.minHours} hours unless something gives.`
      );
    }
  }

  const result = [...fixed, ...movable, ...(sleep ? [sleep] : [])].sort(byStart);
  const moved = changes.filter((c) => c.kind === "moved" && c.key !== opts.disruption?.key);
  const shortened = changes.filter((c) => c.kind === "shortened");
  const skipped = changes.filter((c) => c.kind === "skipped");

  const parts: string[] = [];
  if (opts.disruption && disruptedTitle) {
    parts.push(`${disruptedTitle} ran ${opts.disruption.newEnd - (opts.blocks.find((b) => b.key === opts.disruption!.key)?.end ?? 0)} minutes late.`);
  }
  if (moved.length) parts.push(`Moved ${listTitles(moved)}.`);
  if (shortened.length) parts.push(`Shortened ${listTitles(shortened)} to its minimum.`);
  if (skipped.length) parts.push(`Could not fit ${listTitles(skipped)}.`);
  const horizon = result.find((b) => b.key === "horizon");
  if (horizon && horizon.status !== "skipped") parts.push("Sunset walk preserved.");
  parts.push(`Sleep target held at ${fmtMin(sleep?.start ?? sleepTarget)}.`);

  return { blocks: result, changes, summary: parts.join(" "), warnings };
}

function listTitles(cs: RebalanceProposal["changes"]): string {
  const t = cs.map((c) => c.title);
  if (t.length === 1) return t[0];
  if (t.length === 2) return `${t[0]} and ${t[1]}`;
  return `${t.slice(0, -1).join(", ")} and ${t[t.length - 1]}`;
}

/** First gap at or after `from` that fits `duration` without hitting the wall. */
function nextFreeSlot(
  from: number,
  duration: number,
  occupied: { start: number; end: number }[],
  wall: number
): { start: number } | null {
  const busy = [...occupied].sort(byStart);
  let cursor = from;
  for (const b of busy) {
    if (b.end <= cursor) continue;
    if (b.start >= cursor + duration) break; // gap is big enough
    cursor = Math.max(cursor, b.end);
  }
  return cursor + duration <= wall ? { start: cursor } : null;
}

export function fmtMin(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${ampm}`;
}

/** Hours of sleep a plan actually yields, wake time held constant. */
export function sleepHours(sleepStartMin: number, wakeMin = SLEEP.wakeMin): number {
  const mins = 24 * 60 - sleepStartMin + wakeMin;
  return Math.round((mins / 60) * 100) / 100;
}
