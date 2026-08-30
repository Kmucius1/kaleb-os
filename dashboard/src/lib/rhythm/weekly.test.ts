import { describe, expect, it } from "vitest";
import { PILLARS, toPillar, isPillar } from "./pillars";
import { templateFor, dayTypeOf, HORIZON } from "./template";
import { dowOfDateStr } from "./engine";

// The weekly review is mostly a database read, so these cover the pure parts it
// depends on — the ones that would silently produce a wrong denominator.

describe("weekly review inputs", () => {
  it("counts a gradable block for every pillar it serves, including the second", () => {
    const weekday = templateFor("weekday").filter((b) => b.kind !== "sleep");
    const dryp = weekday.find((b) => b.key === "dryp")!;
    expect(dryp.pillar).toBe("DRYP");
    expect(dryp.pillar2).toBe("Brand");

    // A naive count would credit DRYP once; the review credits both pillars.
    const naive = weekday.length;
    const withSecondary = weekday.reduce((n, b) => n + 1 + (b.pillar2 ? 1 : 0), 0);
    expect(withSecondary).toBeGreaterThan(naive);
  });

  it("excludes sleep from the denominator so it can never count as a miss", () => {
    for (const dayType of ["weekday", "saturday", "sunday"] as const) {
      const gradable = templateFor(dayType).filter((b) => b.kind !== "sleep");
      expect(gradable.some((b) => b.kind === "sleep")).toBe(false);
      expect(gradable.length).toBeLessThan(templateFor(dayType).length);
    }
  });

  it("maps each date in a week to the right day type", () => {
    // 2026-07-26 is a Sunday.
    expect(dayTypeOf(dowOfDateStr("2026-07-26"))).toBe("sunday");
    expect(dayTypeOf(dowOfDateStr("2026-07-27"))).toBe("weekday");
    expect(dayTypeOf(dowOfDateStr("2026-07-31"))).toBe("weekday");
    expect(dayTypeOf(dowOfDateStr("2026-08-01"))).toBe("saturday");
  });

  it("assigns every template block a pillar from the closed set", () => {
    for (const dayType of ["weekday", "saturday", "sunday"] as const) {
      for (const b of templateFor(dayType)) {
        expect(isPillar(b.pillar), `${dayType}/${b.key}`).toBe(true);
        if (b.pillar2) expect(isPillar(b.pillar2), `${dayType}/${b.key} secondary`).toBe(true);
      }
    }
  });

  it("keeps the Horizon floor at five of seven", () => {
    expect(HORIZON.weeklyMinimum).toBe(5);
    expect(HORIZON.weeklyIdeal).toBe(7);
    expect(PILLARS).toContain("Mind");
  });

  it("falls back rather than throwing on an unknown pillar", () => {
    expect(toPillar("Nature")).toBe("Mind");
    expect(toPillar(undefined)).toBe("Mind");
    // Legacy names keep resolving so old rows never fall back to a wrong pillar.
    expect(toPillar("Money")).toBe("DRYP");
    expect(toPillar("Spirit")).toBe("Mind");
    expect(toPillar("Mission")).toBe("Brand");
    expect(toPillar("Body")).toBe("Body");
  });
});
