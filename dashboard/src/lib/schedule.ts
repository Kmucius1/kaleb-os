import { supabase } from "./supabase";
import { TZ, PILLAR_COLORS, fmtClock } from "./clock";

// The schedule engine: resolves today's rhythm in Kaleb's timezone (ET),
// merges the recurring template with one-off events, and tells you (and Atlas)
// exactly which block he's in right now.

// Re-exported from ./clock (pure, client-safe) so existing @/lib/schedule
// imports keep working while the live home timeline can import them without
// pulling in the Supabase client.
export { TZ, PILLAR_COLORS, fmtClock };

export type Block = {
  id: string;
  day_type: string;
  sort_order: number;
  start_min: number;
  end_min: number;
  title: string;
  pillar: string;
  identity: string | null;
  detail: string | null;
  rotates: string | null;
  notify: boolean;
  cue: string | null; // spoken-style notification headline
  theme?: string | null; // resolved rotation theme for today
};

export type SchedEvent = {
  id: string;
  event_date: string;
  start_min: number | null;
  end_min: number | null;
  title: string;
  pillar: string | null;
  location: string | null;
  note: string | null;
  notify: boolean;
};

// ET wall-clock right now: minutes since midnight, day-of-week (0=Sun), date string.
export function etInfo(date = new Date()): { minutes: number; dow: number; dateStr: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, weekday: "short", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hour = Number(get("hour")) % 24;
  const minute = Number(get("minute"));
  const dowMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    minutes: hour * 60 + minute,
    dow: dowMap[get("weekday")] ?? 0,
    dateStr: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

export function dayTypeOf(dow: number): string {
  if (dow === 0) return "sunday";
  if (dow === 6) return "saturday";
  return "weekday";
}

async function getConfig(keys: string[]): Promise<Record<string, any>> {
  const { data } = await supabase.from("kalebos_config").select("key,value").in("key", keys);
  const out: Record<string, any> = {};
  for (const r of data ?? []) {
    try { out[r.key] = JSON.parse(r.value); } catch { out[r.key] = r.value; }
  }
  return out;
}

function resolveTheme(rotates: string | null, dow: number, cfg: Record<string, any>): string | null {
  if (!rotates) return null;
  const key = rotates === "commute" ? "commute_themes" : rotates === "study" ? "study_rotation" : rotates === "content" ? "content_themes" : null;
  if (!key) return null;
  return cfg[key]?.[String(dow)] ?? null;
}

export type TodaySchedule = {
  dayType: string;
  dow: number;
  dateStr: string;
  nowMin: number;
  blocks: Block[];
  events: SchedEvent[];
  current: Block | null;
  next: Block | null;
};

export async function getTodaySchedule(date = new Date()): Promise<TodaySchedule> {
  const { minutes, dow, dateStr } = etInfo(date);
  const dayType = dayTypeOf(dow);

  const [blocksRes, eventsRes, cfg] = await Promise.all([
    supabase.from("schedule_blocks").select("*").eq("day_type", dayType).order("start_min"),
    supabase.from("schedule_events").select("*").eq("event_date", dateStr).order("start_min", { nullsFirst: true }),
    getConfig(["commute_themes", "study_rotation", "content_themes"]),
  ]);

  const blocks: Block[] = (blocksRes.data ?? []).map((b: any) => ({ ...b, theme: resolveTheme(b.rotates, dow, cfg) }));
  const current = blocks.find((b) => minutes >= b.start_min && minutes < b.end_min) ?? null;
  const next = blocks.find((b) => b.start_min > minutes) ?? null;

  return { dayType, dow, dateStr, nowMin: minutes, blocks, events: eventsRes.data ?? [], current, next };
}

// Day-of-week (0=Sun) for a plain ET calendar date "YYYY-MM-DD". Noon-UTC keeps
// us clear of any timezone edge around midnight.
export function dowOfDateStr(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00Z`).getUTCDay();
}

export type DaySchedule = {
  dateStr: string;
  dow: number;
  dayType: string;
  blocks: Block[];
  events: SchedEvent[];
  completed: string[]; // ref_ids (blocks + events) checked off on this date
};

// Full schedule for an arbitrary ET date, with the check-offs recorded for it.
// Powers the schedule page's day navigation (any past/future day).
export async function getScheduleForDate(dateStr: string): Promise<DaySchedule> {
  const dow = dowOfDateStr(dateStr);
  const dayType = dayTypeOf(dow);
  const [blocksRes, eventsRes, compRes, cfg] = await Promise.all([
    supabase.from("schedule_blocks").select("*").eq("day_type", dayType).order("start_min"),
    supabase.from("schedule_events").select("*").eq("event_date", dateStr).order("start_min", { nullsFirst: true }),
    supabase.from("completions").select("ref_id").eq("done_date", dateStr),
    getConfig(["commute_themes", "study_rotation", "content_themes"]),
  ]);
  const blocks: Block[] = (blocksRes.data ?? []).map((b: any) => ({ ...b, theme: resolveTheme(b.rotates, dow, cfg) }));
  const completed = (compRes.data ?? []).map((c: any) => c.ref_id as string);
  return { dateStr, dow, dayType, blocks, events: eventsRes.data ?? [], completed };
}

// How many template blocks a given day-type has (denominator for adherence %).
export async function blockCountsByDayType(): Promise<Record<string, number>> {
  const { data } = await supabase.from("schedule_blocks").select("day_type");
  const out: Record<string, number> = { weekday: 0, saturday: 0, sunday: 0 };
  for (const r of data ?? []) out[(r as any).day_type] = (out[(r as any).day_type] ?? 0) + 1;
  return out;
}

// Compact live context injected into Atlas's system prompt every turn.
// Sourced from the rhythm engine so Atlas sees the same day Kaleb sees —
// sun-anchored Horizon Walk, protected blocks, alignment and sleep included.
export async function getScheduleContext(): Promise<string> {
  const { resolveDay } = await import("./rhythm/day");
  const { scoreDay } = await import("./rhythm/alignment");
  const { SLEEP } = await import("./rhythm/template");

  const day = await resolveDay();
  const a = scoreDay(day.blocks, day.nowMin);
  const label = (b: { title: string; pillar: string; identity?: string; theme?: string | null }) =>
    `${b.title}${b.theme ? ` — ${b.theme}` : ""} [${b.pillar}]${b.identity ? ` · identity: ${b.identity}` : ""}`;

  const h = day.horizon;
  const horizonLine = h.block
    ? `HORIZON WALK: ${h.doneToday ? "done today" : `planned ${fmtClock(h.block.start)}–${fmtClock(h.block.end)}`}. ` +
      `Week ${h.week.done}/7 (floor ${h.week.minimum})${h.week.atRisk ? " — AT RISK" : ""}.`
    : "";

  const protectedNow = day.blocks
    .filter((b) => b.flexibility === "protected" && b.end > day.nowMin && b.kind !== "sleep")
    .slice(0, 3)
    .map((b) => `${fmtClock(b.start)} ${b.title}`)
    .join("; ");

  return [
    `RIGHT NOW (${fmtClock(day.nowMin)} ET, ${day.dayType}): Kaleb should be in "${day.current ? label(day.current) : "an open window"}".`,
    `NEXT: ${day.next ? `${fmtClock(day.next.start)} ${label(day.next)}` : "end of day"}.`,
    protectedNow ? `PROTECTED AHEAD (do not propose moving without asking): ${protectedNow}.` : "",
    `SUN: sunrise ${fmtClock(day.sun.sunriseMin)}, sunset ${fmtClock(day.sun.sunsetMin)}${day.sun.estimated ? " (estimated)" : ""}.`,
    horizonLine,
    `SLEEP TARGET: ${fmtClock(SLEEP.targetSleepMin)}, wake ${fmtClock(SLEEP.wakeMin)}, ${SLEEP.minHours}h floor.`,
    `ALIGNMENT SO FAR: ${a.overall}% of elapsed blocks lived (confidence: ${a.confidence}).`,
    day.conflicts.length ? `CONFLICTS: ${day.conflicts.length} overlapping block(s) need a decision.` : "",
  ].filter(Boolean).join("\n");
}
