// Sunrise / sunset and the Horizon Walk recommendation.
//
// Two layers, on purpose:
//   • pure functions (below) — no network, no DB, fully testable, DST-safe
//     because every time is "minutes since local midnight" derived from an
//     Intl formatter in the target zone rather than UTC arithmetic.
//   • getSunTimes() — the one impure call, hitting open-meteo (already used by
//     the daily brief) with a graceful astronomical fallback when offline.

import { HORIZON } from "./template";
import type { PlannedBlock } from "./types";

export const TZ = "America/New_York";

export type SunTimes = {
  date: string; // YYYY-MM-DD (ET)
  sunriseMin: number; // minutes since local midnight
  sunsetMin: number;
  /** true when these came from the fallback model rather than the API. */
  estimated: boolean;
};

/** Minutes since local midnight for an ISO instant, read in the target zone. */
export function minutesInZone(iso: string, tz = TZ): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return h * 60 + m;
}

/**
 * NOAA-style solar position, good to a few minutes — enough to keep the ritual
 * honest when the network is gone. Returns local-clock minutes including the
 * zone's current UTC offset, so DST is handled by the offset we pass in.
 */
export function estimateSun(
  dateStr: string,
  lat: number,
  lon: number,
  utcOffsetMinutes: number
): { sunriseMin: number; sunsetMin: number } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const start = Date.UTC(y, 0, 1);
  const dayOfYear = Math.floor((Date.UTC(y, m - 1, d) - start) / 86400000) + 1;

  const rad = Math.PI / 180;
  // Fractional year (radians)
  const gamma = ((2 * Math.PI) / 365) * (dayOfYear - 1);
  // Equation of time (minutes)
  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));
  // Solar declination (radians)
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  const latRad = lat * rad;
  // Hour angle at sunrise/sunset (90.833° accounts for refraction + solar disc)
  const cosH =
    Math.cos(90.833 * rad) / (Math.cos(latRad) * Math.cos(decl)) - Math.tan(latRad) * Math.tan(decl);
  // Polar day / night — clamp rather than NaN.
  if (cosH > 1) return { sunriseMin: 0, sunsetMin: 0 };
  if (cosH < -1) return { sunriseMin: 0, sunsetMin: 24 * 60 - 1 };
  const ha = Math.acos(cosH) / rad;

  const sunriseUTCmin = 720 + 4 * (-lon - ha) - eqTime;
  const sunsetUTCmin = 720 + 4 * (-lon + ha) - eqTime;
  const clamp = (v: number) => Math.max(0, Math.min(24 * 60 - 1, Math.round(v)));
  return {
    sunriseMin: clamp(sunriseUTCmin + utcOffsetMinutes),
    sunsetMin: clamp(sunsetUTCmin + utcOffsetMinutes),
  };
}

/** Current UTC offset (minutes) for a zone on a given date — DST-aware. */
export function zoneOffsetMinutes(dateStr: string, tz = TZ): number {
  const probe = new Date(`${dateStr}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
  }).formatToParts(probe);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "12") % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return h * 60 + m - 12 * 60;
}

export type HorizonChoice = "sunrise" | "sunset" | "either";

export type HorizonPlan = {
  /** Which end of the day we're recommending. */
  window: "sunrise" | "sunset";
  /** Block start/end in local minutes, travel excluded. */
  start: number;
  end: number;
  /** When to walk out the door, travel included. */
  leaveAt: number;
  /** The sun moment this is built around. */
  sunMin: number;
  durationMinutes: number;
  why: string;
};

/**
 * Choose sunrise vs sunset and place the walk.
 *
 * Rule of thumb from the spec: weekdays default to sunset, but fall back to
 * sunrise when sunset genuinely collides with work, a meeting or the sleep
 * target. We aim to *finish* around the sun moment for sunset (the good light
 * is the last stretch) and to *start* around it for sunrise.
 */
export function planHorizonWalk(opts: {
  sun: SunTimes;
  /** Blocks that already own time today (used for conflict detection). */
  busy: { start: number; end: number; flexibility: string; title: string }[];
  preference?: HorizonChoice;
  durationMinutes?: number;
  travelMinutes?: number;
  /** Latest we're willing to still be out, usually the sleep target. */
  sleepTargetMin?: number;
  /** Earliest we're willing to be up for a sunrise walk. */
  wakeMin?: number;
}): HorizonPlan {
  const duration = Math.min(
    HORIZON.maxMinutes,
    Math.max(HORIZON.minMinutes, opts.durationMinutes ?? HORIZON.defaultMinutes)
  );
  const travel = opts.travelMinutes ?? HORIZON.travelMinutes;
  const pref = opts.preference ?? "either";
  const sleepTarget = opts.sleepTargetMin ?? 22 * 60;
  const wake = opts.wakeMin ?? 6 * 60;

  const sunsetPlan = (): HorizonPlan => {
    const end = opts.sun.sunsetMin + 10; // linger ten minutes past the drop
    const start = end - duration;
    return {
      window: "sunset",
      start,
      end,
      leaveAt: start - travel,
      sunMin: opts.sun.sunsetMin,
      durationMinutes: duration,
      why: `Sunset is at ${fmt(opts.sun.sunsetMin)}. Leave by ${fmt(start - travel)} to catch the light.`,
    };
  };
  const sunrisePlan = (why: string): HorizonPlan => {
    const start = opts.sun.sunriseMin - 5;
    return {
      window: "sunrise",
      start,
      end: start + duration,
      leaveAt: start - travel,
      sunMin: opts.sun.sunriseMin,
      durationMinutes: duration,
      why,
    };
  };

  if (pref === "sunrise") return sunrisePlan(`Sunrise is at ${fmt(opts.sun.sunriseMin)} — your standing preference.`);

  const evening = sunsetPlan();
  const overlaps = (a: { start: number; end: number }, b: { start: number; end: number }) =>
    a.start < b.end && b.start < a.end;

  // Anything protected that the sunset walk would collide with (travel included).
  const eveningSpan = { start: evening.leaveAt, end: evening.end + travel };
  const clash = opts.busy.find(
    (b) => b.flexibility === "protected" && overlaps(eveningSpan, b)
  );
  const breaksSleep = evening.end + travel > sleepTarget;

  if (pref === "sunset") {
    // Honour the explicit preference but say so when it costs something.
    if (clash) return { ...evening, why: `${evening.why} Heads up: this overlaps ${clash.title}.` };
    if (breaksSleep) return { ...evening, why: `${evening.why} Heads up: you'd get home after your sleep target.` };
    return evening;
  }

  if (clash) {
    return sunrisePlan(
      `Sunset at ${fmt(opts.sun.sunsetMin)} collides with ${clash.title}, so take sunrise at ${fmt(opts.sun.sunriseMin)} instead.`
    );
  }
  if (breaksSleep) {
    return sunrisePlan(
      `Walking at sunset would put you home after your ${fmt(sleepTarget)} sleep target — sunrise at ${fmt(opts.sun.sunriseMin)} protects both.`
    );
  }
  if (evening.leaveAt < wake) {
    // Absurd edge (polar-style data); fall back to sunrise.
    return sunrisePlan(`Sunset timing is unusable today — sunrise at ${fmt(opts.sun.sunriseMin)}.`);
  }
  return evening;
}

function fmt(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${ampm}`;
}

/**
 * Weekly Horizon Walk progress. Five of seven is the floor, seven is the aim —
 * and four is not framed as failure, just as "the floor needs the days left".
 */
export function horizonWeek(completedDates: string[], weekDates: string[], todayStr: string) {
  const doneSet = new Set(completedDates);
  const done = weekDates.filter((d) => doneSet.has(d)).length;
  // Days still available to walk — today counts, yesterday does not.
  const daysLeft = weekDates.filter((d) => d >= todayStr && !doneSet.has(d)).length;
  const mustHit = Math.max(0, HORIZON.weeklyMinimum - done);
  return {
    done,
    of: weekDates.length,
    daysLeft,
    minimum: HORIZON.weeklyMinimum,
    ideal: HORIZON.weeklyIdeal,
    metMinimum: done >= HORIZON.weeklyMinimum,
    /** No longer arithmetically possible to reach five this week. */
    minimumImpossible: done + daysLeft < HORIZON.weeklyMinimum,
    /** Still possible, but only if every remaining day happens. */
    atRisk: mustHit > 0 && mustHit >= daysLeft,
    mustHit,
  };
}

/** Blocks that should be treated as "busy" when placing the walk. */
export const busyFrom = (blocks: PlannedBlock[]) =>
  blocks
    .filter((b) => b.key !== "horizon" && b.kind !== "sleep")
    .map((b) => ({ start: b.start, end: b.end, flexibility: b.locked ? "protected" : b.flexibility, title: b.title }));
