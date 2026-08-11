// Task triage.
//
// PLAUD ingest hears a three-hour meeting and files an action item for every
// action-ish sentence in it — including the ones that belong to the banker, the
// client's CFO, or whoever was arranging chairs. Left alone that produced 306
// open tasks all sitting at the same default priority, which is the same as
// having no task list at all.
//
// Triage answers two questions per task, and only two: whose is it, and does it
// matter. Everything the UI does is a projection of those two answers.

export type TaskOwner = "kaleb" | "team" | "other";

export { TASK_AREAS } from "./taskRubric.mjs";

export type TaskArea =
  | "dryp" | "ehm" | "linkdup" | "kaleb-os" | "trading"
  | "commerce" | "clients" | "personal" | "admin" | "other";

export type Triage = { owner: TaskOwner; priority: number; area: TaskArea };

// Normalized title, so ingest can tell "Discuss getting a couch for the office"
// from its own restatement three chunks later. Strips punctuation, articles and
// filler verbs that a transcript varies freely between passes.
export function dedupeKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(the|a|an|to|for|with|about|on|of|and|re|please|need|needs|should|must)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export type BucketedTask = {
  owner?: string | null;
  priority?: number | null;
  due_date?: string | null;
  triaged_at?: string | null;
};

export type Bucket = "now" | "soon" | "someday" | "notmine" | "untriaged";

// Where a task lands in the UI. Deliberately derived rather than stored — the
// same row moves from "soon" to "now" when its due date arrives, with nothing
// having to write to it.
export function bucketOf(t: BucketedTask, today = todayET()): Bucket {
  if (!t.triaged_at && t.owner == null) return "untriaged";
  if (t.owner && t.owner !== "kaleb") return "notmine";
  if (t.due_date && t.due_date <= today) return "now";
  const p = t.priority ?? 5;
  if (p >= 8) return "now";
  if (p >= 5) return "soon";
  return "someday";
}

// Nothing should be able to put a wall of rows in front of him again — not a
// generous triage run, not a bad model day. Now shows this many; the rest are
// behind one tap.
export const NOW_LIMIT = 12;

export function todayET(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}
