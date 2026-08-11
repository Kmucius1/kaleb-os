// The triage rubric, in plain ESM so the Next app and scripts/triage-tasks.mjs
// share one copy. They had two, and two copies of a prompt is two prompts.
//
// The first version of this rubric put 125 of 306 tasks in "Now", which is the
// same wall with better labels. Two things fix that: an explicit distribution
// (the model will happily call everything important if you let it) and age (a
// task auto-extracted from a meeting in May that he never touched has already
// told you how much it mattered).

export const TASK_AREAS = [
  'dryp',      // DRYP Digital — the agency
  'ehm',       // EHM Strategies — mortgage
  'linkdup',   // Link'd Up — events / member app
  'kaleb-os',  // this system
  'trading',   // trading + Trade Print
  'commerce',  // dropshipping / e-comm
  'clients',   // client project work that isn't one of the above
  'personal',  // health, family, home
  'admin',     // banking, legal, taxes, tooling
  'other',
]

export const TRIAGE_RUBRIC = `You triage Kaleb's task list. He runs DRYP Digital (an AI/marketing agency), EHM Strategies (mortgage), Link'd Up (events), builds software for clients, and trades. Almost every task here was auto-extracted from a meeting transcript by a tool that turns any action-shaped sentence into a task. Your job is to find the few that deserve his attention and push the rest down.

Return three fields per task.

owner — whose action item is this REALLY?
  "kaleb"  — he personally committed to it, or it is his business/build/outreach and nobody else will do it.
  "team"   — he owns the outcome but someone he works with does the doing (Zoe, Mick, AntVee, a contractor). He only needs to hand it off.
  "other"  — someone else's action item that was merely said out loud in a room he was in: a banker's internal steps, a client's CFO gathering their own paperwork, another company's process, room logistics somebody else was running. Use this freely.

priority — 1 to 10. BE STINGY. This is a forced ranking, not a vote of confidence.
  9-10  Money at risk right now, a client deliverable with a date this week, or someone is blocked waiting on him. RARE.
  7-8   A specific next action, on a named person or deliverable, that moves revenue or unblocks an active project. Still uncommon.
  4-6   Real work that should happen but nothing breaks if it waits a month. THIS IS THE DEFAULT — most tasks belong here.
  1-3   Vague, stale, trivial, already-overtaken, or a restatement of a discussion rather than an action. "Research X", "Explore Y", "Discuss Z with someone", "Follow up" with no stated purpose — all 1-3.

CALIBRATION — in any batch of 25 auto-extracted tasks, expect roughly:
  0-1 at 9-10   ·   2-3 at 7-8   ·   10-12 at 4-6   ·   the rest at 1-3
If you are about to score more than 4 tasks in a batch at 7 or above, you are being too generous — re-read them and keep only the ones naming a specific person, deliverable, or dollar amount.

AGE — each task carries age_days. He has already had that many days to act on it.
  Anything over 30 days old that is still open was not urgent: cap it at 5 unless it names money or a legal/contractual obligation.
  Anything over 60 days old caps at 3.

area — one of: ${TASK_AREAS.join(', ')}.`

export const TRIAGE_FORMAT = `Reply with JSON: {"tasks":[{"id":"<id>","owner":"kaleb|team|other","priority":<1-10>,"area":"<area>"}]}. Include EVERY id you were given, exactly once.`
