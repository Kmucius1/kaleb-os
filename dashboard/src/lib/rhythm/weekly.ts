// The weekly review, assembled from what actually happened.
//
// Reports per-pillar consistency and a Horizon count next to the numbers that
// explain them — never one blended score standing in for the whole week. Where
// data is missing it says so instead of showing a zero that looks like failure.

import { supabase } from "../supabase";
import { PILLARS, type Pillar } from "./pillars";
import { templateFor, HORIZON } from "./template";
import { dayTypeOf } from "./template";
import { dowOfDateStr } from "./engine";
import { getHorizonLog, weekDates, todayET } from "./day";

export type PillarWeek = {
  pillar: Pillar;
  done: number;
  of: number;
  pct: number;
};

export type WeeklyReview = {
  weekStart: string;
  weekEnd: string;
  /** Days of this week that have actually happened (today included). */
  elapsedDays: number;
  byPillar: PillarWeek[];
  horizon: { done: number; minimum: number; ideal: number; metMinimum: boolean };
  journals: number;
  habits: { name: string; done: number; of: number }[];
  tasksCompleted: number;
  tasksOpen: number;
  /** Anything we genuinely have no data for, named rather than shown as zero. */
  missing: string[];
};

export async function buildWeeklyReview(anchor = todayET()): Promise<WeeklyReview> {
  const dates = weekDates(anchor);
  const today = todayET();
  const elapsed = dates.filter((d) => d <= today);

  const [compRes, journalRes, habitRes, habitDefRes, taskRes, horizonLog] = await Promise.all([
    supabase.from("completions").select("ref_id,done_date").gte("done_date", dates[0]).lte("done_date", dates[6]),
    supabase.from("journal").select("id,created_at").gte("created_at", `${dates[0]}T00:00:00Z`),
    supabase.from("habit_logs").select("habit_id,log_date,done").eq("done", true).gte("log_date", dates[0]).lte("log_date", dates[6]),
    supabase.from("habits").select("id,name").eq("active", true),
    supabase.from("tasks").select("id,status,updated_at,created_at"),
    getHorizonLog(dates[0], dates[6]),
  ]);

  const doneByDate = new Map<string, Set<string>>();
  for (const c of compRes.data ?? []) {
    const set = doneByDate.get(c.done_date) ?? new Set<string>();
    set.add(String(c.ref_id));
    doneByDate.set(c.done_date, set);
  }

  // Per-pillar: how many of that pillar's blocks, across elapsed days, got done.
  const tally: Record<string, { done: number; of: number }> = {};
  for (const p of PILLARS) tally[p] = { done: 0, of: 0 };
  for (const d of elapsed) {
    const blocks = templateFor(dayTypeOf(dowOfDateStr(d))).filter((b) => b.kind !== "sleep");
    const done = doneByDate.get(d) ?? new Set<string>();
    for (const b of blocks) {
      const pillars = [b.pillar, ...(b.pillar2 ? [b.pillar2] : [])];
      for (const p of pillars) {
        tally[p].of += 1;
        if (done.has(b.key)) tally[p].done += 1;
      }
    }
  }

  const habitNames = new Map((habitDefRes.data ?? []).map((h) => [String(h.id), String(h.name)]));
  const habitTally = new Map<string, number>();
  for (const l of habitRes.data ?? []) {
    habitTally.set(String(l.habit_id), (habitTally.get(String(l.habit_id)) ?? 0) + 1);
  }

  const tasks = taskRes.data ?? [];
  const completedThisWeek = tasks.filter(
    (t) => t.status === "completed" && String(t.updated_at ?? t.created_at ?? "").slice(0, 10) >= dates[0]
  ).length;

  const missing: string[] = [];
  if ((journalRes.data ?? []).length === 0) missing.push("No journal entries this week");
  if ((habitDefRes.data ?? []).length === 0) missing.push("No active habits configured");
  if (elapsed.length < 7) missing.push(`Week still running — ${elapsed.length} of 7 days so far`);

  return {
    weekStart: dates[0],
    weekEnd: dates[6],
    elapsedDays: elapsed.length,
    byPillar: PILLARS.map((p) => ({
      pillar: p,
      done: tally[p].done,
      of: tally[p].of,
      pct: tally[p].of === 0 ? 0 : Math.round((tally[p].done / tally[p].of) * 100),
    })),
    horizon: {
      done: horizonLog.length,
      minimum: HORIZON.weeklyMinimum,
      ideal: HORIZON.weeklyIdeal,
      metMinimum: horizonLog.length >= HORIZON.weeklyMinimum,
    },
    journals: (journalRes.data ?? []).length,
    habits: (habitDefRes.data ?? []).map((h) => ({
      name: habitNames.get(String(h.id)) ?? "Habit",
      done: habitTally.get(String(h.id)) ?? 0,
      of: elapsed.length,
    })),
    tasksCompleted: completedThisWeek,
    tasksOpen: tasks.filter((t) => t.status === "pending" || t.status === "in_progress").length,
    missing,
  };
}
