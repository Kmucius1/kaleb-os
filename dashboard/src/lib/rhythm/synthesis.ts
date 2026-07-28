// Journal synthesis — connections across weeks that you can't see from inside
// a single entry.
//
// Two layers on purpose:
//   • counted facts (streaks, moods, unfinished commitments) — computed, exact,
//     always available, no model involved.
//   • the read (themes, blind spots, what keeps recurring) — a model's opinion,
//     clearly labelled as such and only produced when there is enough to read.
//
// Never diagnoses. It describes what he wrote, not what it says about him.

import { chatJSON } from "../llm";
import { supabase } from "../supabase";

export type Counted = {
  entries: number;
  days: number;
  byMoment: Record<string, number>;
  moods: { mood: string; count: number }[];
  openCommitments: { text: string; since: string }[];
  approvedCount: number;
  rejectedCount: number;
};

export type Read = {
  themes: string[];
  wins: string[];
  frustrations: string[];
  recurringIdeas: string[];
  blindSpots: string[];
  contentWorthy: string[];
  connection: string;
};

export type Synthesis = {
  counted: Counted;
  read: Read | null;
  /** Why `read` is null, when it is. */
  readNote: string | null;
  windowDays: number;
};

const MIN_ENTRIES_FOR_READ = 4;

export async function synthesize(windowDays = 30): Promise<Synthesis> {
  const since = new Date(Date.now() - windowDays * 86400000).toISOString();

  const [entriesRes, actionsRes] = await Promise.all([
    supabase
      .from("journal")
      .select("id,content,kind,mood,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(120),
    supabase
      .from("agent_actions")
      .select("id,action_type,payload,status,created_at")
      .like("action_type", "journal_%")
      .gte("created_at", since),
  ]);

  const entries = entriesRes.data ?? [];
  const actions = actionsRes.data ?? [];

  const byMoment: Record<string, number> = {};
  const moodCount: Record<string, number> = {};
  const days = new Set<string>();
  for (const e of entries) {
    const k = String(e.kind ?? "freeform");
    byMoment[k] = (byMoment[k] ?? 0) + 1;
    if (e.mood) moodCount[String(e.mood)] = (moodCount[String(e.mood)] ?? 0) + 1;
    days.add(new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date(e.created_at)));
  }

  // Commitments he approved into tasks that are still open — the honest version
  // of "things I said I'd do".
  const approved = actions.filter((a) => a.status === "approved" && a.action_type === "journal_task");
  const openCommitments = await openTasksFrom(approved);

  const counted: Counted = {
    entries: entries.length,
    days: days.size,
    byMoment,
    moods: Object.entries(moodCount)
      .map(([mood, count]) => ({ mood, count }))
      .sort((a, b) => b.count - a.count),
    openCommitments,
    approvedCount: actions.filter((a) => a.status === "approved").length,
    rejectedCount: actions.filter((a) => a.status === "rejected").length,
  };

  if (entries.length < MIN_ENTRIES_FOR_READ) {
    return {
      counted,
      read: null,
      readNote: `Needs at least ${MIN_ENTRIES_FOR_READ} entries to look for patterns — there ${entries.length === 1 ? "is" : "are"} ${entries.length}.`,
      windowDays,
    };
  }

  const read = await readEntries(entries.map((e) => ({
    when: String(e.created_at).slice(0, 10),
    kind: String(e.kind ?? ""),
    text: String(e.content ?? "").slice(0, 1500),
  })));

  return {
    counted,
    read: read.value,
    readNote: read.value ? null : read.error,
    windowDays,
  };
}

async function openTasksFrom(
  actions: { payload: unknown }[]
): Promise<{ text: string; since: string }[]> {
  const titles = actions
    .map((a) => (a.payload as Record<string, unknown> | null)?.text)
    .filter((t): t is string => typeof t === "string");
  if (titles.length === 0) return [];

  const { data } = await supabase
    .from("tasks")
    .select("title,created_at,status")
    .in("status", ["pending", "in_progress"])
    .in("title", titles.slice(0, 50));

  return (data ?? []).map((t) => ({
    text: String(t.title),
    since: String(t.created_at ?? "").slice(0, 10),
  }));
}

const SYSTEM = `You read Kaleb's journal entries and report what actually recurs.

Return JSON with these keys, each an array of short strings unless noted:
  themes          - what he keeps returning to, in his own language
  wins            - things that went right, deduplicated across entries
  frustrations    - what repeatedly drains or blocks him
  recurringIdeas  - ideas he has raised more than once and not yet acted on
  blindSpots      - things he mentions in passing but never follows up on
  contentWorthy   - thoughts that would make strong content, phrased as hooks
  connection      - ONE sentence (a string, not an array) naming a link across
                    weeks he probably hasn't noticed

Hard rules:
- Ground every item in something actually written. No generic productivity advice.
- Do NOT diagnose, label, or speculate about mental health. No clinical language.
- Do NOT moralise or motivate. Describe, don't cheerlead.
- If a category genuinely has nothing, return an empty array. That is a real answer.`;

async function readEntries(
  entries: { when: string; kind: string; text: string }[]
): Promise<{ value: Read | null; error: string }> {
  try {
    const body = entries.map((e) => `[${e.when}${e.kind ? ` · ${e.kind}` : ""}]\n${e.text}`).join("\n\n---\n\n");
    const raw = await chatJSON<Partial<Read>>(SYSTEM, body.slice(0, 40000), { temperature: 0.3 });
    const arr = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, 8) : [];
    return {
      value: {
        themes: arr(raw.themes),
        wins: arr(raw.wins),
        frustrations: arr(raw.frustrations),
        recurringIdeas: arr(raw.recurringIdeas),
        blindSpots: arr(raw.blindSpots),
        contentWorthy: arr(raw.contentWorthy),
        connection: typeof raw.connection === "string" ? raw.connection : "",
      },
      error: "",
    };
  } catch (e) {
    const msg = (e as Error)?.message ?? "";
    // Say which wall we hit — "no patterns" and "no credit" are different facts.
    const error = /limit exceeded|quota|402|403/i.test(msg)
      ? "Your OpenRouter key is out of credit this month, so there's no pattern read below. The counts above are still exact."
      : /OPENROUTER_API_KEY is not set/i.test(msg)
        ? "No OpenRouter key configured, so there's no pattern read below. The counts above are still exact."
        : "Couldn't reach the model for the pattern read. The counts above are still exact.";
    return { value: null, error };
  }
}
