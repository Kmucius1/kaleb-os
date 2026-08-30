// Server-side glue: pull real sun times, real events, real completions and
// hand the pure engine everything it needs.
//
// Storage note: per-day changes live in `schedule_instances` and Horizon
// check-ins in `horizon_walks` (migration 0024). Where that migration has not
// been applied yet, the accessors below fall back to the original
// `kalebos_config` blobs (`day:<date>` / `horizon_log`) so an older database
// keeps working — see `usingRhythmTables()`.

import { supabase } from "../supabase";
import { materializeDay, rebalanceDay, dowOfDateStr } from "./engine";
import { estimateSun, horizonWeek, minutesInZone, zoneOffsetMinutes, type SunTimes, type HorizonChoice } from "./sun";
import { dayTypeOf, templateFor } from "./template";
import { toPillar } from "./pillars";
import type { PlannedBlock, TemplateBlock } from "./types";

export const TZ = "America/New_York";

export const todayET = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());

export function etNowMinutes(date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return h * 60 + m;
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Sunday-anchored week containing `dateStr`. */
export function weekDates(dateStr: string): string[] {
  const start = addDays(dateStr, -dowOfDateStr(dateStr));
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

type Loc = { lat: number; lon: number; city: string; beachTravelMinutes?: number };

const DEFAULT_LOC: Loc = { lat: 26.12, lon: -80.14, city: "Fort Lauderdale", beachTravelMinutes: 12 };

export async function getLocation(): Promise<Loc> {
  try {
    const { data } = await supabase.from("kalebos_config").select("value").eq("key", "location").maybeSingle();
    const raw = JSON.parse(data?.value || "{}");
    return { ...DEFAULT_LOC, ...raw };
  } catch {
    return DEFAULT_LOC;
  }
}

/**
 * Real sunrise/sunset for a date. Uses open-meteo (already the app's weather
 * source); falls back to the local astronomical model when offline so the
 * Horizon Walk still works on a plane or with the network down.
 */
export async function getSunTimes(dateStr: string, loc?: Loc): Promise<SunTimes> {
  const l = loc ?? (await getLocation());
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${l.lat}&longitude=${l.lon}` +
      `&daily=sunrise,sunset&timezone=${encodeURIComponent(TZ)}&start_date=${dateStr}&end_date=${dateStr}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (res.ok) {
      const j = await res.json();
      const sr = j?.daily?.sunrise?.[0];
      const ss = j?.daily?.sunset?.[0];
      if (sr && ss) {
        // open-meteo returns local wall-clock ISO without a zone suffix.
        return {
          date: dateStr,
          sunriseMin: localIsoToMinutes(sr),
          sunsetMin: localIsoToMinutes(ss),
          estimated: false,
        };
      }
    }
  } catch {
    /* fall through to the estimate */
  }
  const est = estimateSun(dateStr, l.lat, l.lon, zoneOffsetMinutes(dateStr, TZ));
  return { date: dateStr, ...est, estimated: true };
}

/** "2026-07-28T20:08" → minutes since midnight. Zone-suffixed input is handled too. */
function localIsoToMinutes(iso: string): number {
  const m = /T(\d{2}):(\d{2})/.exec(iso);
  if (m && !/[Zz]|[+-]\d{2}:\d{2}$/.test(iso)) return Number(m[1]) * 60 + Number(m[2]);
  return minutesInZone(iso, TZ);
}

async function getConfigJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const { data } = await supabase.from("kalebos_config").select("value").eq("key", key).maybeSingle();
    if (!data?.value) return fallback;
    return JSON.parse(data.value) as T;
  } catch {
    return fallback;
  }
}

async function setConfigJson(key: string, value: unknown): Promise<void> {
  await supabase.from("kalebos_config").upsert({ key, value: JSON.stringify(value) }, { onConflict: "key" });
}

// ---------------------------------------------------------------------------
// Which storage the rhythm is on.
//
// Probed once per process rather than assumed, so deploy order doesn't matter:
// ship the code before the migration and it keeps using config; apply the
// migration and the next cold start picks up the real tables. Once 0024 is
// applied everywhere, the `legacy*` functions and this probe can be deleted.
// ---------------------------------------------------------------------------

let rhythmTables: Promise<boolean> | null = null;

export function usingRhythmTables(): Promise<boolean> {
  rhythmTables ??= (async () => {
    try {
      const { error } = await supabase.from("schedule_instances").select("id").limit(1);
      return !error;
    } catch {
      return false;
    }
  })();
  return rhythmTables;
}

export type DayState = {
  overrides: Record<string, { start: number; end: number; status?: PlannedBlock["status"] }>;
  locked: string[];
};

const EMPTY_DAY: DayState = { overrides: {}, locked: [] };

/**
 * Everything that makes one dated day differ from the rhythm: blocks that were
 * moved, shortened, skipped or pinned. Stored sparsely — a block that still
 * matches the template has no row, so it reads as untouched rather than as
 * "moved from" its own start time.
 */
export async function getDayState(dateStr: string): Promise<DayState> {
  if (!(await usingRhythmTables())) return getConfigJson<DayState>(`day:${dateStr}`, EMPTY_DAY);

  const { data, error } = await supabase
    .from("schedule_instances")
    .select("block_key,start_min,end_min,status,locked")
    .eq("instance_date", dateStr);
  if (error || !data) return EMPTY_DAY;

  const state: DayState = { overrides: {}, locked: [] };
  for (const row of data as InstanceRow[]) {
    state.overrides[row.block_key] = {
      start: row.start_min,
      end: row.end_min,
      ...(row.status === "skipped" ? { status: "skipped" as const } : {}),
    };
    if (row.locked) state.locked.push(row.block_key);
  }
  return state;
}

export async function setDayState(dateStr: string, state: DayState): Promise<void> {
  if (!(await usingRhythmTables())) return setConfigJson(`day:${dateStr}`, state);

  const lockedKeys = new Set(state.locked);
  const keys = [...new Set([...Object.keys(state.overrides), ...state.locked])];
  const meta = await blockMeta(dateStr, keys);

  const rows = keys.flatMap((key) => {
    // A key we can no longer explain (template edited out from under a stored
    // day) is dropped rather than written as a row with invented columns.
    const m = meta.get(key);
    if (!m) return [];
    const ov = state.overrides[key];
    const start = ov?.start ?? m.start;
    const end = ov?.end ?? m.end;
    const moved = start !== m.start || end !== m.end;
    return [
      {
        instance_date: dateStr,
        block_key: key,
        title: m.title,
        pillar: m.pillar,
        pillar2: m.pillar2 ?? null,
        identity: m.identity ?? null,
        kind: m.kind,
        start_min: start,
        end_min: end,
        flexibility: m.flexibility,
        priority: m.priority,
        min_minutes: m.minMinutes ?? null,
        pref_minutes: m.prefMinutes ?? null,
        energy: m.energy,
        location: m.location ?? null,
        travel_min: m.travelMinutes ?? null,
        status: ov?.status ?? "planned",
        locked: lockedKeys.has(key),
        moved_from_start: moved ? m.start : null,
        moved_from_end: moved ? m.end : null,
        updated_at: new Date().toISOString(),
      },
    ];
  });

  if (rows.length) {
    await supabase.from("schedule_instances").upsert(rows, { onConflict: "instance_date,block_key" });
  }

  // Anything no longer overridden or pinned goes back to the rhythm. Read the
  // existing keys and diff in JS rather than building a negated `in` filter —
  // block keys are user-facing slugs and don't belong in a filter string.
  const { data: existing } = await supabase
    .from("schedule_instances")
    .select("block_key")
    .eq("instance_date", dateStr);
  const stale = (existing ?? []).map((r: { block_key: string }) => r.block_key).filter((k) => !keys.includes(k));
  if (stale.length) {
    await supabase.from("schedule_instances").delete().eq("instance_date", dateStr).in("block_key", stale);
  }
}

type InstanceRow = {
  block_key: string;
  start_min: number;
  end_min: number;
  status: PlannedBlock["status"];
  locked: boolean;
};

/**
 * The template (or dated event) behind each key, for the columns an instance
 * row needs. Only ever read — writing an instance never touches the rhythm.
 */
async function blockMeta(dateStr: string, keys: string[]): Promise<Map<string, TemplateBlock>> {
  const map = new Map<string, TemplateBlock>();
  const dow = dowOfDateStr(dateStr);
  const tpl = templateFor(dayTypeOf(dow), dow);
  for (const key of keys) {
    const found = tpl.find((b) => b.key === key);
    if (found) map.set(key, found);
  }

  const eventIds = keys.filter((k) => k.startsWith("event:")).map((k) => k.slice("event:".length));
  if (eventIds.length) {
    const { data } = await supabase.from("schedule_events").select("*").in("id", eventIds);
    for (const e of data ?? []) {
      map.set(`event:${e.id}`, {
        key: `event:${e.id}`,
        title: e.title,
        pillar: toPillar(e.pillar),
        kind: "event",
        start: e.start_min ?? 0,
        end: e.end_min ?? (e.start_min ?? 0) + 60,
        flexibility: "protected",
        priority: 1,
        energy: "medium",
        location: e.location ?? undefined,
      });
    }
  }
  return map;
}

export type HorizonPrefs = {
  preference: HorizonChoice;
  durationMinutes: number;
  travelMinutes: number;
};

export const getHorizonPrefs = () =>
  getConfigJson<HorizonPrefs>("horizon_prefs", { preference: "either", durationMinutes: 45, travelMinutes: 12 });

export type HorizonLog = {
  date: string;
  window: "sunrise" | "sunset";
  method: string;
  /** silence | walking-meditation | gratitude | voice-journal | content | recovery | watch */
  mode?: string;
  note?: string;
};

export async function getHorizonLog(from: string, to: string): Promise<HorizonLog[]> {
  if (!(await usingRhythmTables())) {
    const all = await getConfigJson<HorizonLog[]>("horizon_log", []);
    return all.filter((h) => h.date >= from && h.date <= to);
  }

  const { data, error } = await supabase
    .from("horizon_walks")
    .select("walk_date,window,method,mode,note")
    .gte("walk_date", from)
    .lte("walk_date", to)
    .order("walk_date");
  if (error || !data) return [];
  return data.map((r: HorizonRow) => ({
    date: r.walk_date,
    window: r.window,
    method: r.method,
    ...(r.mode ? { mode: r.mode } : {}),
    ...(r.note ? { note: r.note } : {}),
  }));
}

export async function logHorizonWalk(entry: HorizonLog): Promise<void> {
  if (!(await usingRhythmTables())) {
    const all = await getConfigJson<HorizonLog[]>("horizon_log", []);
    const next = [...all.filter((h) => h.date !== entry.date), entry].sort((a, b) => a.date.localeCompare(b.date));
    // Keep a rolling year — this is a config row, not a warehouse.
    return setConfigJson("horizon_log", next.slice(-400));
  }

  await supabase.from("horizon_walks").upsert(
    {
      walk_date: entry.date,
      window: entry.window,
      method: entry.method,
      mode: entry.mode ?? null,
      note: entry.note ?? null,
    },
    { onConflict: "walk_date" }
  );
}

export async function removeHorizonWalk(dateStr: string): Promise<void> {
  if (!(await usingRhythmTables())) {
    const all = await getConfigJson<HorizonLog[]>("horizon_log", []);
    return setConfigJson("horizon_log", all.filter((h) => h.date !== dateStr));
  }
  await supabase.from("horizon_walks").delete().eq("walk_date", dateStr);
}

type HorizonRow = {
  walk_date: string;
  window: "sunrise" | "sunset";
  method: string;
  mode: string | null;
  note: string | null;
};

/** Rotation themes ("University on wheels" per weekday) — preserved from the old engine. */
async function resolveThemes(dow: number): Promise<Record<string, string | null>> {
  const [commute, study, content] = await Promise.all([
    getConfigJson<Record<string, string>>("commute_themes", {}),
    getConfigJson<Record<string, string>>("study_rotation", {}),
    getConfigJson<Record<string, string>>("content_themes", {}),
  ]);
  const d = String(dow);
  return { commute: commute[d] ?? null, study: study[d] ?? null, content: content[d] ?? null, freedom: null };
}

export type ResolvedDay = {
  dateStr: string;
  dayType: ReturnType<typeof dayTypeOf>;
  nowMin: number;
  isToday: boolean;
  blocks: PlannedBlock[];
  conflicts: ReturnType<typeof materializeDay>["conflicts"];
  sun: SunTimes;
  horizon: {
    block: PlannedBlock | null;
    doneToday: boolean;
    week: ReturnType<typeof horizonWeek>;
  };
  current: PlannedBlock | null;
  next: PlannedBlock | null;
};

/** Everything the Home and Schedule screens need for one date, in one call. */
export async function resolveDay(dateStr = todayET()): Promise<ResolvedDay> {
  const week = weekDates(dateStr);
  const [sun, prefs, state, eventsRes, compRes, horizonLog, themes] = await Promise.all([
    getSunTimes(dateStr),
    getHorizonPrefs(),
    getDayState(dateStr),
    supabase.from("schedule_events").select("*").eq("event_date", dateStr).order("start_min", { nullsFirst: true }),
    supabase.from("completions").select("ref_id").eq("done_date", dateStr),
    getHorizonLog(week[0], week[6]),
    resolveThemes(dowOfDateStr(dateStr)),
  ]);

  const completed = (compRes.data ?? []).map((c: { ref_id: string }) => c.ref_id);
  const { dayType, blocks: raw, conflicts } = materializeDay({
    dateStr,
    sun,
    events: eventsRes.data ?? [],
    horizonPreference: prefs.preference,
    horizonMinutes: prefs.durationMinutes,
    horizonTravelMinutes: prefs.travelMinutes,
    completed,
    locked: state.locked,
    overrides: state.overrides,
  });

  const blocks = raw.map((b) => (b.rotates ? { ...b, theme: themes[b.rotates] ?? null } : b));

  const nowMin = etNowMinutes();
  const isToday = dateStr === todayET();
  const current = isToday ? blocks.find((b) => nowMin >= b.start && nowMin < b.end) ?? null : null;
  const next = isToday ? blocks.find((b) => b.start > nowMin) ?? null : blocks[0] ?? null;
  const horizonBlock = blocks.find((b) => b.key === "horizon") ?? null;
  const walked = horizonLog.map((h) => h.date);

  return {
    dateStr,
    dayType,
    nowMin,
    isToday,
    blocks,
    conflicts,
    sun,
    horizon: {
      block: horizonBlock,
      doneToday: walked.includes(dateStr) || horizonBlock?.status === "done",
      week: horizonWeek(walked, week, todayET()),
    },
    current,
    next,
  };
}

/** Build a rebalance proposal for today. Never persists — approval does that. */
export async function proposeRebalance(disruption?: { key: string; newEnd: number }) {
  const day = await resolveDay(todayET());
  return { day, proposal: rebalanceDay({ blocks: day.blocks, nowMin: day.nowMin, disruption }) };
}

/** Persist an approved proposal as per-day overrides — the template is untouched. */
export async function applyRebalance(dateStr: string, blocks: PlannedBlock[]): Promise<void> {
  const state = await getDayState(dateStr);
  const overrides = { ...state.overrides };
  for (const b of blocks) {
    overrides[b.key] = { start: b.start, end: b.end, ...(b.status === "skipped" ? { status: "skipped" as const } : {}) };
  }
  await setDayState(dateStr, { ...state, overrides });
}

export async function toggleLock(dateStr: string, key: string): Promise<string[]> {
  const state = await getDayState(dateStr);
  const locked = state.locked.includes(key) ? state.locked.filter((k) => k !== key) : [...state.locked, key];
  await setDayState(dateStr, { ...state, locked });
  return locked;
}
