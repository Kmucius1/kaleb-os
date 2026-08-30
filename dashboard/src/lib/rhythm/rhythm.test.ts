import { describe, expect, it } from "vitest";
import { estimateSun, horizonWeek, minutesInZone, planHorizonWalk, zoneOffsetMinutes, type SunTimes } from "./sun";
import { findConflicts, fitEvening, materializeDay, overlaps, rebalanceDay, sleepHours, durationOf } from "./engine";
import { COMMUTE, GYM, gymStatusFor, H, HORIZON, SLEEP, templateFor } from "./template";
import { PILLARS } from "./pillars";
import type { PlannedBlock } from "./types";

const sun = (sunriseMin: number, sunsetMin: number, date = "2026-07-28"): SunTimes => ({
  date,
  sunriseMin,
  sunsetMin,
  estimated: false,
});

/* ------------------------------ template ------------------------------ */

describe("template", () => {
  it("has exactly six pillars and no Nature", () => {
    expect(PILLARS).toHaveLength(6);
    expect(PILLARS as readonly string[]).not.toContain("Nature");
  });

  it("weekday rhythm wakes at 6:00 AM, not the old 3:00 AM", () => {
    const wake = templateFor("weekday").find((b) => b.key === "wake")!;
    expect(wake.start).toBe(H(6, 0));
  });

  it("protects trading 7–9 AM and DRYP 10 AM–6 PM", () => {
    const t = templateFor("weekday");
    const trading = t.find((b) => b.key === "trading")!;
    const dryp = t.find((b) => b.key === "dryp")!;
    expect([trading.start, trading.end]).toEqual([H(7, 0), H(9, 0)]);
    expect(trading.flexibility).toBe("protected");
    expect([dryp.start, dryp.end]).toEqual([H(10, 0), H(18, 0)]);
    expect(dryp.flexibility).toBe("protected");
  });

  it("carves the gym out of the office day rather than scheduling against it", () => {
    const gym = templateFor("weekday").find((b) => b.key === "gym")!;
    expect(gym.containedIn).toBe("dryp");
    expect(gym.start).toBeGreaterThanOrEqual(GYM.windowStart);
    expect(gym.end).toBeLessThanOrEqual(GYM.windowEnd);
    expect(gym.minMinutes).toBe(60);
    expect(gym.prefMinutes).toBe(75);
  });

  it("drops the gym entirely on rest days so it cannot be missed", () => {
    // Wednesday (3) and Sunday (0) are rest by design.
    expect(templateFor("weekday", 3).some((b) => b.key === "gym")).toBe(false);
    expect(templateFor("sunday", 0).some((b) => b.key === "gym")).toBe(false);
    // Mandatory days still carry it.
    for (const dow of [1, 2, 4, 5]) {
      expect(templateFor("weekday", dow).some((b) => b.key === "gym")).toBe(true);
    }
    expect(gymStatusFor(3)).toBe("rest");
    expect(gymStatusFor(6)).toBe("optional");
    expect(gymStatusFor(1)).toBe("mandatory");
  });

  it("plans the commute with 45 minutes but allows 30", () => {
    const c = templateFor("weekday").find((b) => b.key === "commute-in")!;
    expect(durationOf(c)).toBe(COMMUTE.planWith);
    expect(c.minMinutes).toBe(COMMUTE.minMinutes);
    expect(COMMUTE.planWith).toBe(45);
    // Departure target is 9:15, arriving for a 10:00 office start.
    expect(c.start).toBe(H(9, 15));
    expect(c.end).toBe(H(10, 0));
  });

  it("lights out at 10 PM for exactly eight hours", () => {
    expect(SLEEP.targetSleepMin).toBe(H(22, 0));
    expect(SLEEP.wakeMin).toBe(H(6, 0));
    expect((24 * 60 - SLEEP.targetSleepMin + SLEEP.wakeMin) / 60).toBe(SLEEP.minHours);
  });

  it("never assigns a block a floor longer than its preferred duration", () => {
    for (const dayType of ["weekday", "saturday", "sunday"] as const) {
      for (const b of templateFor(dayType)) {
        const min = b.minMinutes ?? durationOf(b);
        const preferred = b.prefMinutes ?? durationOf(b);
        expect(min, `${dayType}/${b.key}`).toBeLessThanOrEqual(preferred);
      }
    }
  });
});

/* -------------------------------- sun --------------------------------- */

describe("sun", () => {
  it("estimates South Florida sunrise/sunset within ~15 minutes of reality", () => {
    // Fort Lauderdale, 2026-07-28: sunrise ≈ 6:45 AM, sunset ≈ 8:08 PM ET.
    const off = zoneOffsetMinutes("2026-07-28");
    const s = estimateSun("2026-07-28", 26.12, -80.14, off);
    expect(Math.abs(s.sunriseMin - H(6, 45))).toBeLessThan(15);
    expect(Math.abs(s.sunsetMin - H(20, 8))).toBeLessThan(15);
  });

  it("handles DST correctly — the same clock time shifts by an hour in January", () => {
    expect(zoneOffsetMinutes("2026-07-28")).toBe(-240); // EDT
    expect(zoneOffsetMinutes("2026-01-15")).toBe(-300); // EST
    const winter = estimateSun("2026-01-15", 26.12, -80.14, zoneOffsetMinutes("2026-01-15"));
    // Winter sunset in South Florida is around 5:40 PM — hardcoding 6 PM would break.
    expect(winter.sunsetMin).toBeLessThan(H(18, 0));
    expect(winter.sunsetMin).toBeGreaterThan(H(17, 0));
  });

  it("reads local minutes from an ISO instant in the target zone", () => {
    expect(minutesInZone("2026-07-28T12:00:00Z")).toBe(H(8, 0)); // 12:00 UTC = 8:00 EDT
  });

  it("defaults to sunset on a clear weekday evening", () => {
    const plan = planHorizonWalk({
      sun: sun(H(6, 45), H(20, 8)),
      busy: [{ start: H(11, 5), end: H(17, 30), flexibility: "protected", title: "DRYP Builder Block" }],
      sleepTargetMin: SLEEP.targetSleepMin,
    });
    expect(plan.window).toBe("sunset");
    // Finishes just after the sun drops, leaves early enough to travel there.
    expect(plan.end).toBeGreaterThanOrEqual(H(20, 8));
    expect(plan.leaveAt).toBeLessThan(plan.start);
  });

  it("slides past protected work rather than abandoning the evening for sunrise", () => {
    // Winter: sunset at 5:40 PM lands inside the office block. Starting twelve
    // minutes after work ends still catches usable light — jumping to a 7 AM
    // sunrise walk (the old behaviour) gave up the evening for no reason.
    const plan = planHorizonWalk({
      sun: sun(H(7, 5), H(17, 40)),
      busy: [{ start: H(11, 5), end: H(17, 30), flexibility: "protected", title: "DRYP Builder Block" }],
      sleepTargetMin: SLEEP.targetSleepMin,
    });
    expect(plan.window).toBe("sunset");
    expect(plan.leaveAt).toBeGreaterThanOrEqual(H(17, 30));
    expect(plan.why).toMatch(/DRYP/);
  });

  it("never plans a walk that overlaps a block it was told about", () => {
    const busy = [
      { start: H(7, 0), end: H(9, 0), flexibility: "protected", title: "Trading Session" },
      { start: H(10, 0), end: H(18, 0), flexibility: "protected", title: "DRYP Builder Block" },
      { start: H(18, 0), end: H(19, 0), flexibility: "protected", title: "Commute Home" },
    ];
    // Across a full season of sun positions, the plan must never land on one.
    for (let i = 0; i < 90; i++) {
      const plan = planHorizonWalk({
        sun: sun(410 + Math.round(i * 0.45), 1185 - Math.round(i * 1.4)),
        busy,
        sleepTargetMin: SLEEP.targetSleepMin,
      });
      for (const b of busy) {
        expect(overlaps({ start: plan.leaveAt, end: plan.end }, b), `day ${i} hits ${b.title}`).toBe(false);
      }
    }
  });

  it("falls back to sunrise when a sunset walk would break the sleep target", () => {
    const plan = planHorizonWalk({
      sun: sun(H(6, 30), H(21, 40)), // absurdly late sunset
      busy: [],
      sleepTargetMin: SLEEP.targetSleepMin,
    });
    expect(plan.window).toBe("sunrise");
  });

  it("honours an explicit sunrise preference but still reports the cost of sunset", () => {
    const s = sun(H(6, 45), H(20, 8));
    expect(planHorizonWalk({ sun: s, busy: [], preference: "sunrise" }).window).toBe("sunrise");
    const forced = planHorizonWalk({
      sun: sun(H(6, 30), H(21, 40)),
      busy: [],
      preference: "sunset",
      sleepTargetMin: SLEEP.targetSleepMin,
    });
    expect(forced.window).toBe("sunset");
    expect(forced.why).toMatch(/sleep target/i);
  });

  it("clamps duration to the 30–60 minute range", () => {
    const s = sun(H(6, 45), H(20, 8));
    expect(planHorizonWalk({ sun: s, busy: [], durationMinutes: 5 }).durationMinutes).toBe(HORIZON.minMinutes);
    expect(planHorizonWalk({ sun: s, busy: [], durationMinutes: 300 }).durationMinutes).toBe(HORIZON.maxMinutes);
  });

  it("includes travel time in the leave-by time", () => {
    const plan = planHorizonWalk({ sun: sun(H(6, 45), H(20, 8)), busy: [], travelMinutes: 20 });
    expect(plan.start - plan.leaveAt).toBe(20);
  });
});

/* -------------------------- horizon week tracking -------------------------- */

describe("horizon week", () => {
  const week = ["2026-07-26", "2026-07-27", "2026-07-28", "2026-07-29", "2026-07-30", "2026-07-31", "2026-08-01"];

  it("counts five of seven as meeting the minimum", () => {
    const w = horizonWeek(week.slice(0, 5), week, "2026-08-01");
    expect(w.done).toBe(5);
    expect(w.metMinimum).toBe(true);
    expect(w.mustHit).toBe(0);
  });

  it("flags the minimum as at risk when every remaining day must count", () => {
    // Two done, Wednesday today → five days left counting today, need three more.
    const w = horizonWeek(week.slice(0, 2), week, "2026-07-30");
    expect(w.mustHit).toBe(3);
    expect(w.daysLeft).toBe(3);
    expect(w.atRisk).toBe(true);
    expect(w.minimumImpossible).toBe(false);
  });

  it("reports the minimum as impossible only when arithmetic says so", () => {
    const w = horizonWeek([week[0]], week, "2026-07-31");
    expect(w.daysLeft).toBe(2);
    expect(w.minimumImpossible).toBe(true);
  });

  it("does not treat four of seven as failure — it still reports progress", () => {
    const w = horizonWeek(week.slice(0, 4), week, "2026-08-01");
    expect(w.done).toBe(4);
    expect(w.ideal).toBe(7);
    expect(w.minimum).toBe(5);
    expect(w.mustHit).toBe(1);
  });
});

/* ------------------------------- overlaps ------------------------------- */

describe("overlap detection", () => {
  it("treats touching endpoints as non-overlapping", () => {
    expect(overlaps({ start: 60, end: 120 }, { start: 120, end: 180 })).toBe(false);
    expect(overlaps({ start: 60, end: 121 }, { start: 120, end: 180 })).toBe(true);
  });

  it("finds every overlapping pair with its overlap length", () => {
    const c = findConflicts([
      { key: "a", start: 0, end: 60 },
      { key: "b", start: 30, end: 90 },
      { key: "c", start: 120, end: 180 },
    ]);
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ a: "a", b: "b", overlapMinutes: 30 });
  });

  it("produces a conflict-free weekday plan from the template", () => {
    const day = materializeDay({ dateStr: "2026-07-28", sun: sun(H(6, 45), H(20, 8)) });
    expect(day.dayType).toBe("weekday");
    expect(day.conflicts).toEqual([]);
  });

  it("generates the gym only on training days, shrinking the rest-day denominator", () => {
    // Mon Tue Thu Fri train, Saturday is optional, Wednesday and Sunday rest.
    const week: [string, boolean][] = [
      ["2026-09-07", true], ["2026-09-08", true], ["2026-09-09", false],
      ["2026-09-10", true], ["2026-09-11", true], ["2026-09-12", true], ["2026-09-13", false],
    ];
    const counts: Record<string, number> = {};
    for (const [dateStr, wantsGym] of week) {
      const day = materializeDay({ dateStr, sun: sun(H(6, 50), H(19, 40)) });
      expect(day.blocks.some((b) => b.key === "gym"), dateStr).toBe(wantsGym);
      expect(day.conflicts, dateStr).toEqual([]);
      counts[dateStr] = day.blocks.filter((b) => b.kind !== "sleep").length;
    }
    // The point of dropping it: a rest day has strictly fewer gradable blocks,
    // so a missed workout on Wednesday is not arithmetically possible.
    expect(counts["2026-09-09"]).toBeLessThan(counts["2026-09-07"]);
  });

  it("stays conflict-free across every day of Season 1", () => {
    // The sun moves ~2 hours between September and December, and the walk is
    // anchored to it. Checking one date proves nothing: an earlier version of
    // this schedule was clean in July and collided on 77 of these 90 days,
    // because a clipped sunset silently fell back to a sunrise slot laid on
    // top of trading.
    const offenders: string[] = [];
    for (let i = 0; i < 90; i++) {
      const d = new Date(Date.UTC(2026, 8, 1));
      d.setUTCDate(d.getUTCDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      // Fort Lauderdale drift: sunrise later, sunset markedly earlier.
      const day = materializeDay({
        dateStr,
        sun: sun(410 + Math.round(i * 0.45), 1185 - Math.round(i * 1.4)),
      });
      if (day.conflicts.length) offenders.push(`${dateStr}: ${JSON.stringify(day.conflicts)}`);
    }
    expect(offenders).toEqual([]);
  });

  it("never lays the Horizon Walk on top of another block", () => {
    for (let i = 0; i < 90; i++) {
      const d = new Date(Date.UTC(2026, 8, 1));
      d.setUTCDate(d.getUTCDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const { blocks } = materializeDay({
        dateStr,
        sun: sun(410 + Math.round(i * 0.45), 1185 - Math.round(i * 1.4)),
      });
      const walk = blocks.find((b) => b.key === "horizon");
      if (!walk || walk.status === "skipped") continue;
      for (const b of blocks) {
        if (b.key === "horizon" || b.kind === "sleep" || b.status === "skipped") continue;
        expect(overlaps(walk, b), `${dateStr}: walk overlaps ${b.key}`).toBe(false);
      }
    }
  });
});

/* ----------------------------- materialize ----------------------------- */

describe("materializeDay", () => {
  it("catches a summer sunset, and stays out of the way when winter makes that impossible", () => {
    const summer = materializeDay({ dateStr: "2026-07-28", sun: sun(H(6, 45), H(20, 8)) });
    const winter = materializeDay({ dateStr: "2026-01-15", sun: sun(H(7, 5), H(17, 40)) });
    const hs = summer.blocks.find((b) => b.key === "horizon")!;
    const hw = winter.blocks.find((b) => b.key === "horizon")!;

    // Summer: the walk genuinely spans the sunset.
    expect(hs.start).toBeLessThanOrEqual(H(20, 8));
    expect(hs.end).toBeGreaterThanOrEqual(H(20, 8));

    // Winter is the honest part. A 10–6 office day plus the commute means the
    // walk cannot reach a 5:40 PM sunset at all — it becomes evening outdoor
    // time after the commute rather than a sun ritual. It still gets scheduled,
    // and it still never collides with anything.
    expect(hw.start).toBeGreaterThanOrEqual(H(19, 0));
    expect(winter.conflicts).toEqual([]);
  });

  it("turns dated events into protected blocks", () => {
    const day = materializeDay({
      dateStr: "2026-07-28",
      sun: sun(H(6, 45), H(20, 8)),
      events: [{ id: "e1", title: "Client call", start_min: H(14, 0), end_min: H(15, 0) }],
    });
    const ev = day.blocks.find((b) => b.key === "event:e1")!;
    expect(ev.flexibility).toBe("protected");
    expect(ev.title).toBe("Client call");
  });

  it("marks completed keys as done and respects approved overrides", () => {
    const day = materializeDay({
      dateStr: "2026-07-28",
      sun: sun(H(6, 45), H(20, 8)),
      completed: ["gym"],
      overrides: { content: { start: H(20, 35), end: H(21, 20) } },
    });
    expect(day.blocks.find((b) => b.key === "gym")!.status).toBe("done");
    const content = day.blocks.find((b) => b.key === "content")!;
    expect(content.start).toBe(H(20, 35));
    expect(content.movedFrom).toBeTruthy();
  });

  it("keeps the whole day in chronological order", () => {
    const { blocks } = materializeDay({ dateStr: "2026-07-28", sun: sun(H(6, 45), H(20, 8)) });
    const starts = blocks.map((b) => b.start);
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
  });
});

/* --------------------------- evening vs sleep --------------------------- */

describe("evening layout protects sleep", () => {
  it("never lets the evening push sleep past the latest bedtime", () => {
    // Late July: sunset ~8:09 PM leaves barely an hour of evening.
    const { blocks } = materializeDay({ dateStr: "2026-07-28", sun: sun(H(6, 44), H(20, 9)) });
    const sleep = blocks.find((b) => b.kind === "sleep")!;
    expect(sleep.start).toBeLessThanOrEqual(SLEEP.latestSleepMin);
    expect(sleepHours(sleep.start)).toBeGreaterThanOrEqual(SLEEP.minHours);
  });

  it("defers the lowest-priority evening work rather than eating into sleep", () => {
    const { blocks } = materializeDay({ dateStr: "2026-07-28", sun: sun(H(6, 44), H(20, 9)) });
    const deferred = blocks.filter((b) => b.status === "skipped");
    expect(deferred.length).toBeGreaterThan(0);
    // Content Studio is priority 3; the evening journal (priority 2) outranks it.
    expect(deferred.map((b) => b.key)).toContain("content");
    expect(deferred.map((b) => b.key)).not.toContain("journal-pm");
    for (const b of deferred) expect(b.reason).toBeTruthy();
  });

  it("keeps the full evening when an early winter sunset leaves room", () => {
    const { blocks } = materializeDay({ dateStr: "2026-01-15", sun: sun(H(7, 5), H(17, 40)) });
    const deferred = blocks.filter((b) => b.status === "skipped");
    expect(deferred).toHaveLength(0);
    // The property that matters is not an exact duration — the evening is a
    // genuinely tight 7:00–9:30 window — but that nothing is dropped and every
    // survivor keeps at least its stated floor.
    const content = blocks.find((b) => b.key === "content")!;
    expect(content.end - content.start).toBeGreaterThanOrEqual(content.minMinutes!);
    const freedom = blocks.find((b) => b.key === "freedom")!;
    expect(freedom.end - freedom.start).toBeGreaterThanOrEqual(freedom.minMinutes!);
    // Nothing in the evening may run past the 9:30 shutdown.
    const shutdown = blocks.find((b) => b.key === "meditation-pm")!;
    expect(shutdown.start).toBe(H(21, 30));
    for (const b of blocks.filter((x) => x.kind !== "sleep" && x.key !== "meditation-pm" && x.key !== "journal-pm")) {
      expect(b.end).toBeLessThanOrEqual(H(21, 30));
    }
  });

  it("fitEvening shortens to minimums before it drops anything", () => {
    const tpl = templateFor("weekday").filter((b) => ["dinner", "freedom", "content"].includes(b.key));
    const prefTotal = tpl.reduce((s, b) => s + (b.prefMinutes ?? b.end - b.start), 0);
    const minTotal = tpl.reduce((s, b) => s + (b.minMinutes ?? b.end - b.start), 0);
    const tight = fitEvening(tpl, 0, minTotal); // exactly enough for the minimums
    expect(tight.deferred).toHaveLength(0);
    expect(tight.laid.reduce((s, b) => s + (b.end - b.start), 0)).toBe(minTotal);
    const roomy = fitEvening(tpl, 0, prefTotal);
    expect(roomy.laid.reduce((s, b) => s + (b.end - b.start), 0)).toBe(prefTotal);
  });

  it("still produces a conflict-free day when the evening is squeezed", () => {
    const day = materializeDay({ dateStr: "2026-07-28", sun: sun(H(6, 44), H(20, 9)) });
    const live = day.blocks.filter((b) => b.status !== "skipped");
    expect(findConflicts(live)).toEqual([]);
  });
});

/* ------------------------------ rebalance ------------------------------ */

const planFor = (dateStr = "2026-07-28") =>
  materializeDay({ dateStr, sun: sun(H(6, 45), H(20, 8)) }).blocks;

describe("rebalanceDay", () => {
  it("absorbs a meeting that ran 35 minutes late without touching sleep", () => {
    const blocks = planFor();
    const before = blocks.find((b) => b.key === "content")!;
    const out = rebalanceDay({
      blocks,
      nowMin: H(18, 5),
      disruption: { key: "commute-home", newEnd: H(18, 45) },
    });
    const after = out.blocks.find((b) => b.key === "content")!;
    expect(after.start).toBeGreaterThanOrEqual(before.start);
    const sleep = out.blocks.find((b) => b.kind === "sleep")!;
    expect(sleep.start).toBeGreaterThanOrEqual(SLEEP.targetSleepMin);
    expect(out.summary).toMatch(/Sleep target held/);
  });

  it("never moves a protected block", () => {
    const blocks = planFor();
    const out = rebalanceDay({ blocks, nowMin: H(6, 30) });
    for (const key of ["trading", "dryp", "commute-in"]) {
      const a = blocks.find((b) => b.key === key)!;
      const b = out.blocks.find((x) => x.key === key)!;
      expect([b.start, b.end], key).toEqual([a.start, a.end]);
    }
  });

  it("never moves a block the user locked", () => {
    const blocks = planFor().map((b) => (b.key === "content" ? { ...b, locked: true } : b));
    const before = blocks.find((b) => b.key === "content")!;
    const out = rebalanceDay({ blocks, nowMin: H(18, 0), disruption: { key: "commute-home", newEnd: H(19, 0) } });
    const after = out.blocks.find((b) => b.key === "content")!;
    expect([after.start, after.end]).toEqual([before.start, before.end]);
  });

  it("shortens toward the minimum rather than dropping a block outright", () => {
    // A single flexible block wanting 60 minutes, with only 50 before the wall:
    // it should survive at its 45-minute floor, not disappear.
    const freedom = planFor().find((b) => b.key === "freedom")!;
    const block: PlannedBlock = { ...freedom, start: H(21, 0), end: H(22, 0), status: "planned" };
    const out = rebalanceDay({ blocks: [block], nowMin: H(21, 0), sleepTargetMin: H(21, 50) });
    const after = out.blocks.find((b) => b.key === "freedom")!;
    expect(after.status).not.toBe("skipped");
    expect(after.end - after.start).toBe(freedom.minMinutes);
    expect(out.changes.some((c) => c.kind === "shortened")).toBe(true);
  });

  it("never leaves a surviving block shorter than its stated minimum", () => {
    const out = rebalanceDay({ blocks: planFor(), nowMin: H(20, 30), sleepTargetMin: H(21, 45) });
    for (const b of out.blocks) {
      if (b.status === "skipped" || b.kind === "sleep") continue;
      const min = b.minMinutes ?? durationOf(b);
      expect(b.end - b.start, b.key).toBeGreaterThanOrEqual(Math.min(min, durationOf(b)));
    }
  });

  it("never compresses sleep below eight hours to fit low-priority work", () => {
    const blocks = planFor();
    const out = rebalanceDay({ blocks, nowMin: H(21, 0) });
    const sleep = out.blocks.find((b) => b.kind === "sleep")!;
    expect(sleepHours(sleep.start)).toBeGreaterThanOrEqual(SLEEP.minHours);
  });

  it("skips rather than deletes, and always says why", () => {
    const blocks = planFor();
    const out = rebalanceDay({ blocks, nowMin: H(21, 30), sleepTargetMin: H(21, 45) });
    const skipped = out.blocks.filter((b) => b.status === "skipped");
    expect(out.blocks.length).toBe(blocks.length); // nothing deleted
    for (const s of skipped) expect(s.reason).toBeTruthy();
    for (const c of out.changes) expect(c.why).toBeTruthy();
  });

  it("warns when the Horizon Walk cannot fit", () => {
    const blocks = planFor().map((b) =>
      b.key === "horizon" ? { ...b, start: H(21, 0), end: H(21, 45) } : b
    );
    const out = rebalanceDay({ blocks, nowMin: H(21, 30), sleepTargetMin: H(21, 45) });
    const horizon = out.blocks.find((b) => b.key === "horizon")!;
    if (horizon.status === "skipped") {
      expect(out.warnings.join(" ")).toMatch(/Horizon Walk/);
    }
  });

  it("leaves already-completed and past blocks exactly where they were", () => {
    const blocks: PlannedBlock[] = planFor().map((b) =>
      b.key === "gym" ? { ...b, status: "done" as const } : b
    );
    const gymBefore = blocks.find((b) => b.key === "gym")!;
    const out = rebalanceDay({ blocks, nowMin: H(18, 0), disruption: { key: "commute-home", newEnd: H(19, 0) } });
    const gymAfter = out.blocks.find((b) => b.key === "gym")!;
    expect([gymAfter.start, gymAfter.end]).toEqual([gymBefore.start, gymBefore.end]);
    expect(gymAfter.status).toBe("done");
  });

  it("produces a human explanation of what changed", () => {
    const out = rebalanceDay({
      blocks: planFor(),
      nowMin: H(18, 0),
      disruption: { key: "commute-home", newEnd: H(18, 45) },
    });
    expect(out.summary.length).toBeGreaterThan(20);
    expect(out.summary).toMatch(/Sleep target/);
  });
});

/* ------------------------- overrides / dragging ------------------------- */

describe("per-day overrides", () => {
  const base = { dateStr: "2026-07-28", sun: sun(H(6, 44), H(20, 9)) };

  it("marks a block as moved only when it actually landed elsewhere", () => {
    const moved = materializeDay({ ...base, overrides: { gym: { start: H(9, 30), end: H(10, 30) } } });
    expect(moved.blocks.find((b) => b.key === "gym")!.movedFrom).toEqual({ start: GYM.windowStart, end: GYM.windowStart + GYM.prefMinutes });

    // An override identical to the template is a no-op, not a change.
    const noop = materializeDay({ ...base, overrides: { gym: { start: GYM.windowStart, end: GYM.windowStart + GYM.prefMinutes } } });
    expect(noop.blocks.find((b) => b.key === "gym")!.movedFrom).toBeUndefined();
  });

  it("exposes the template times through movedFrom so a revert can find them", () => {
    const day = materializeDay({ ...base, overrides: { gym: { start: H(14, 0), end: H(15, 0) } } });
    const gym = day.blocks.find((b) => b.key === "gym")!;
    expect(gym.start).toBe(H(14, 0));
    expect(gym.movedFrom).toEqual({ start: GYM.windowStart, end: GYM.windowStart + GYM.prefMinutes });
  });

  it("surfaces the overlap a drag creates instead of hiding it", () => {
    // Dragged so it spills out of the office day it is carved from: the gym is
    // no longer *inside* DRYP, so the containment exemption stops applying.
    const day = materializeDay({ ...base, overrides: { gym: { start: H(9, 30), end: H(10, 30) } } });
    const live = day.blocks.filter((b) => b.status !== "skipped" && b.kind !== "sleep");
    const clashes = findConflicts(live).filter((c) => c.a === "gym" || c.b === "gym");
    expect(clashes.length).toBeGreaterThan(0);
  });

  it("keeps protected blocks protected no matter what an override says", () => {
    const day = materializeDay({ ...base, overrides: { trading: { start: H(8, 0), end: H(10, 0) } } });
    // The override is honoured (the server guards the write), but the block's
    // flexibility never degrades — the guard still applies next time.
    expect(day.blocks.find((b) => b.key === "trading")!.flexibility).toBe("protected");
  });
});

/* -------------------------------- sleep -------------------------------- */

describe("sleep protection", () => {
  it("computes hours from a sleep start against a fixed 6 AM wake", () => {
    expect(sleepHours(H(21, 45))).toBeCloseTo(8.25, 1);
    expect(sleepHours(H(22, 0))).toBeCloseTo(8, 1);
    expect(sleepHours(H(23, 0))).toBeCloseTo(7, 1);
  });

  it("keeps the wake time fixed at 6:00 AM", () => {
    expect(SLEEP.wakeMin).toBe(H(6, 0));
    expect(SLEEP.minHours).toBe(8);
  });
});
