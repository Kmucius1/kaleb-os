import { supabase } from "./supabase";

// The schedule engine: resolves today's rhythm in Kaleb's timezone (ET),
// merges the recurring template with one-off events, and tells you (and Atlas)
// exactly which block he's in right now.

export const TZ = "America/New_York";

export const PILLAR_COLORS: Record<string, string> = {
  Spirit: "#a78bfa",
  Mind: "#60a5fa",
  Body: "#34d399",
  Money: "#fbbf24",
  Mission: "#fb923c",
  Relationships: "#f472b6",
};

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

export function fmtClock(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
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

// Compact live schedule context injected into Atlas's system prompt every turn.
export async function getScheduleContext(): Promise<string> {
  const s = await getTodaySchedule();
  const cur = s.current
    ? `${s.current.title}${s.current.theme ? ` — ${s.current.theme}` : ""} [${s.current.pillar}]${s.current.identity ? ` · identity: ${s.current.identity}` : ""}`
    : "unscheduled / transition";
  const nxt = s.next ? `${fmtClock(s.next.start_min)} ${s.next.title}${s.next.theme ? ` — ${s.next.theme}` : ""}` : "end of day";
  const themes = s.blocks.filter((b) => b.theme).map((b) => `${b.title.replace(/^Commute — /, "").replace(/ .*/, "")}=${b.theme}`);
  const events = s.events.length
    ? s.events.map((e) => `${e.start_min != null ? fmtClock(e.start_min) + " " : ""}${e.title}`).join("; ")
    : "none";
  const clock = fmtClock(s.nowMin);
  return [
    `RIGHT NOW (${clock} ET, ${s.dayType}): Kaleb should be in "${cur}".`,
    `NEXT: ${nxt}.`,
    themes.length ? `TODAY'S ROTATIONS: ${themes.join(", ")}.` : "",
    `TODAY'S EVENTS: ${events}.`,
  ].filter(Boolean).join("\n");
}
