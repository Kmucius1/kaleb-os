import { describe, expect, it } from "vitest";
import { pickMessage, slotForBlock, SLOTS, type Bank } from "./bank";
import { materializeDay } from "./engine";
import { noticesFor } from "./notify";

const bank: Bank = {
  morning: ["a", "b", "c", "d", "e"],
  trading: ["t1", "t2", "t3"],
  gym: ["g1"],
  content: ["c1", "c2"],
  evening: ["e1", "e2"],
  sleep: ["s1", "s2", "s3"],
};

describe("picking a line", () => {
  it("says the same thing all day", () => {
    // The cron runs every five minutes. If the line moved between ticks, two
    // pushes for the same block could contradict each other.
    const first = pickMessage(bank, "morning", "2026-09-07");
    for (let i = 0; i < 50; i++) {
      expect(pickMessage(bank, "morning", "2026-09-07")).toBe(first);
    }
  });

  it("does not repeat across a working week", () => {
    const week = ["2026-09-07", "2026-09-08", "2026-09-09", "2026-09-10", "2026-09-11"];
    const lines = week.map(d => pickMessage(bank, "morning", d));
    expect(new Set(lines).size).toBeGreaterThan(1);
  });

  it("reaches every line in the slot over a season", () => {
    // A line nobody ever sees is a line not worth storing.
    const seen = new Set<string>();
    for (let i = 0; i < 90; i++) {
      const d = new Date(Date.UTC(2026, 8, 1));
      d.setUTCDate(d.getUTCDate() + i);
      seen.add(pickMessage(bank, "morning", d.toISOString().slice(0, 10))!);
    }
    expect(seen.size).toBe(bank.morning!.length);
  });

  it("keeps slots independent", () => {
    // Same date, different slots — these must not move in lockstep.
    const day = "2026-09-07";
    const a = pickMessage({ morning: ["x", "y", "z"] }, "morning", day);
    const b = pickMessage({ trading: ["x", "y", "z"] }, "trading", day);
    expect([a, b].every(v => v !== null)).toBe(true);
  });

  it("returns null rather than an empty push when a slot has no lines", () => {
    expect(pickMessage({}, "gym", "2026-09-07")).toBeNull();
    expect(pickMessage({ gym: [] }, "gym", "2026-09-07")).toBeNull();
  });

  it("handles a single-line slot without dividing by zero", () => {
    expect(pickMessage(bank, "gym", "2026-09-07")).toBe("g1");
    expect(pickMessage(bank, "gym", "2026-11-29")).toBe("g1");
  });
});

describe("which blocks speak", () => {
  it("maps the measured blocks to a slot", () => {
    expect(slotForBlock("wake")).toBe("morning");
    expect(slotForBlock("trading")).toBe("trading");
    expect(slotForBlock("gym")).toBe("gym");
    expect(slotForBlock("content")).toBe("content");
    expect(slotForBlock("content-batch")).toBe("content");
    expect(slotForBlock("meditation-pm")).toBe("evening");
    expect(slotForBlock("sleep")).toBe("sleep");
  });

  it("gives each slot exactly one voice per day", () => {
    // meditation-am and journal-pm sit ten minutes from blocks that already
    // carry their slot's line. Letting them speak too would send the same
    // sentence twice in a row.
    expect(slotForBlock("meditation-am")).toBeNull();
    expect(slotForBlock("journal-pm")).toBeNull();
    const spoken = ["wake", "trading", "gym", "content", "meditation-pm", "sleep"].map(slotForBlock);
    expect(new Set(spoken).size).toBe(spoken.length);
  });

  it("stays quiet everywhere else", () => {
    // A motivational line on every block trains him to ignore all of them.
    for (const key of ["commute-in", "commute-home", "dinner", "breakfast", "get-ready", "dryp", "horizon"]) {
      expect(slotForBlock(key), key).toBeNull();
    }
  });

  it("only ever returns a real slot", () => {
    for (const key of ["wake", "trading", "gym", "content", "meditation-pm", "sleep"]) {
      expect(SLOTS).toContain(slotForBlock(key)!);
    }
  });
});

/* ------------------------------------------------------------------------ */

describe("a whole day of pushes", () => {
  // Realistic, distinctive sentences: single letters would match as substrings
  // of every body and prove nothing.
  const dayBank: Bank = {
    morning: ["Win the morning quietly."],
    trading: ["Grade the plan, not the outcome."],
    gym: ["Add something to the bar."],
    content: ["Distribution compounds."],
    evening: ["Let the day be over."],
    sleep: ["Protect the wake-up."],
  };

  const sun = (a: number, b: number) => ({ sunriseMin: a, sunsetMin: b, solarNoonMin: (a + b) / 2 }) as never;

  const dayFor = (dateStr: string) => {
    const d = materializeDay({ dateStr, sun: sun(410, 1180) });
    return {
      ...d, dateStr, sun: sun(410, 1180), nowMin: 0,
      horizon: {
        block: d.blocks.find(b => b.key === "horizon"),
        doneToday: false,
        week: { done: 3, atRisk: false, minimumImpossible: false, daysLeft: 4 },
      },
    } as never;
  };

  const allNotices = (dateStr: string, b: Bank) => {
    const day = dayFor(dateStr);
    const seen = new Set<string>();
    const out: { id: string; body: string }[] = [];
    for (let min = 0; min < 1440; min += 5) {
      for (const n of noticesFor(day, min, b)) {
        if (seen.has(n.id)) continue;
        seen.add(n.id);
        out.push({ id: n.id, body: n.body });
      }
    }
    return out;
  };

  it("never says the same line twice in one day", () => {
    // Three notifications repeating one sentence at bedtime is how a system
    // trains you to swipe it away. This is the regression guard for that.
    const notices = allNotices("2026-09-07", dayBank);
    const lines = Object.values(dayBank).flat();
    for (const line of lines) {
      const uses = notices.filter(n => n.body.includes(line)).length;
      expect(uses, `"${line}" used ${uses}x`).toBeLessThanOrEqual(1);
    }
  });

  it("never repeats the block's own prose after its line", () => {
    // "Progressive overload. Add something to the bar. Progressive overload…"
    const gymNotice = allNotices("2026-09-07", dayBank).find(n => n.id.startsWith("block:gym:"));
    expect(gymNotice).toBeDefined();
    expect(gymNotice!.body).toBe("Add something to the bar.");
  });

  it("stays silent through quiet hours", () => {
    const day = dayFor("2026-09-07");
    for (const min of [23 * 60, 0, 2 * 60, 5 * 60]) {
      expect(noticesFor(day, min, dayBank), `minute ${min}`).toEqual([]);
    }
  });
});
