# The Rhythm System

> "My values run my life. My schedule protects my values."

This is the part of KalebOS that decides what Kaleb should be doing right now,
what moves when the day changes, and what is never allowed to move.

Everything lives under `src/lib/rhythm/`. The engine is **pure** — no network, no
database, no `Date.now()` — so all of it is deterministic and tested.

---

## The shape of it

```
template.ts   the rhythm as data (in code, not the DB)
     │
     ▼
sun.ts        real sunrise/sunset → where the Horizon Walk goes today
     │
     ▼
engine.ts     materializeDay()  template + sun + events + overrides → a dated plan
              rebalanceDay()    the day slipped; what still fits
              fitEvening()      the evening vs the sleep target
     │
     ▼
day.ts        the only impure layer: Supabase + open-meteo + config
     │
     ├── alignment.ts   per-pillar scoring with a confidence level
     ├── weekly.ts      the Sunday review
     ├── notify.ts      which pushes are due, and why they matter
     ├── extract.ts     journal → proposals (approval required)
     └── synthesis.ts   patterns across weeks
```

### Template vs instance

The **template** is the recurring intent ("weekdays, 7–9 AM is Trading"). It
lives in `template.ts`, in code, because it is Kaleb's law and should be
reviewable in a diff.

An **instance** is one dated copy of that intent, which the engine may move,
shorten, lock, skip or complete — without ever touching the template. Tomorrow
always starts clean from the rhythm.

Per-day changes are stored as **overrides**, keyed by block slug. An override
identical to the template is deleted rather than stored, so a block never claims
to have "moved from" its own start time.

---

## The rules the engine will not break

In priority order — these are enforced in `engine.ts` and covered by tests:

1. **Sleep keeps its eight hours.** Wake time is fixed at 6:00 AM. Evening work
   is deferred before sleep is compressed, never the other way round.
2. **Protected blocks don't move silently.** Sleep, trading, the DRYP block,
   commutes and dated events are `protected`. The engine reports a conflict; it
   does not resolve one by moving them. `/api/rhythm/move` refuses them too.
3. **The Horizon Walk survives.** It moves to the other end of the day (sunset →
   sunrise) before it is ever dropped.
4. **Blocks shorten before they disappear**, and never below `minMinutes`.
5. **Nothing is deleted.** Anything that genuinely cannot fit is marked
   `skipped` with a reason, so it can carry into tomorrow.

### Flexibility

| Level | Means | Examples |
|---|---|---|
| `protected` | Never moved without an explicit decision | Sleep, Trading, DRYP, meetings, commutes |
| `flexible` | Slides and shortens intelligently | Gym, Horizon Walk, Content, Freedom Block |
| `movable` | First to give way | Admin, errands, optional research |

Locking a block (long-press / the Lock button) promotes it to `protected` for
that day only.

---

## The Horizon Walk

The beach at sunrise or sunset, every day, **minimum five of seven**.

Sunset moves about two hours across the year, so the block is never hardcoded.
`planHorizonWalk()` takes the real sun times and today's protected work and:

- defaults to **sunset** on weekdays,
- falls back to **sunrise** when sunset collides with protected work or would
  push him past the sleep target,
- honours an explicit preference, but still says what that costs,
- clamps duration to 30–60 minutes and includes travel in the leave-by time.

Weekly tracking distinguishes three states that a naive counter would blur:
`metMinimum` (five reached), `atRisk` (still possible, but every remaining day
must count), and `minimumImpossible` (arithmetically out of reach). Four of
seven is reported as progress, never as failure.

**A real consequence worth knowing:** in high summer, sunset around 8:10 PM
means a 45-minute walk plus travel gets him home near 8:30 PM, leaving ~75
minutes before the 9:45 PM sleep target. Dinner and both evening rituals fit;
the Freedom Block and Content Studio get deferred. That is the sleep rule
working, not a bug. Setting `horizon_prefs.preference` to `sunrise` reclaims the
evening on those days.

---

## Sources of truth

| What | Where | Why |
|---|---|---|
| The rhythm template | `src/lib/rhythm/template.ts` | Reviewable in a diff |
| Dated changes | `kalebos_config` key `day:<YYYY-MM-DD>` | Interim — see migration 0024 |
| Horizon check-ins | `kalebos_config` key `horizon_log` | Interim — see migration 0024 |
| Preferences | `kalebos_config` keys `horizon_prefs`, `location` | |
| Check-offs | `completions` table, keyed by block **slug** + date | Survives template edits |
| Dated events | `schedule_events` table | KalebOS is the calendar |
| Notification rows | `schedule_blocks` table | Projection of the template |

`schedule_blocks` is a **projection**, not the source. Run
`node scripts/seed-rhythm.mjs --apply` to re-render it from the template (it
backs up the existing rows into `kalebos_config` first). Nothing in the new UI
reads it — it exists for the notification cron and older surfaces.

---

## Migration 0024

`supabase/migrations/0024_rhythm.sql` adds first-class tables for what is
currently held in config: `schedule_instances`, `horizon_walks`, and the journal
enrichment columns (`moment`, `transcript`, `summary`, `energy`, `entities`).

Until it is applied:

- `day.ts` reads and writes the config-backed equivalents through accessors, so
  switching over is a one-file change,
- `POST /api/journal` retries without the extended columns and returns
  `degraded: true` rather than failing.

To apply it you need a Supabase personal access token for the KalebOS account in
`dashboard/.env.local` as `SUPABASE_ACCESS_TOKEN`, then:

```bash
scripts/apply-migration.sh supabase/migrations/0024_rhythm.sql
```

---

## Approvals

KalebOS may **read and propose**. It may not create commitments.

Journal extraction queues everything into `agent_actions` with
`status = 'pending_approval'` and the exact sentence it came from. `POST
/api/approvals` is the only thing that executes one. A failed execution stays
pending rather than reporting success.

The same rule governs rebalancing: `GET /api/rhythm/rebalance` returns a
proposal, and only `POST { apply: true }` writes it.

---

## Environment variables

| Variable | Used for | Without it |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | All app data | Nothing works |
| `SUPABASE_ACCESS_TOKEN` | Applying migrations | Migrations can't run (management API) |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | Atlas, journal extraction, Insights, daily brief | Those features say so explicitly and degrade; nothing crashes |
| `VAPID_*`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web push | No notifications |
| `CRON_SECRET` | Authenticating `/api/cron/*` | Cron endpoints are open |
| `SESSION_TOKEN` | The login gate | Local dev stays open |
| `ELEVENLABS_*` | Atlas spoken replies | Falls back to browser speech |

No sunrise/sunset key is needed — open-meteo is keyless, and `sun.ts` falls back
to a local NOAA-style model when the network is unavailable.

---

## Tests

```bash
npm test
```

52 tests, all pure. They cover overlap detection, travel time, DST and the
sunrise/sunset model against real South Florida times, sleep protection,
rebalancing (moved / shortened / skipped / never-touched-protected), per-day
overrides, and five-of-seven Horizon tracking.

Four of them exist because they caught real bugs during the build: a rebalance
that dragged the whole evening earlier, a duplicated sleep block, an impossible
`minMinutes > prefMinutes` on sleep, and the no-op override described above.
