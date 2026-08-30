# Kaleb OS

Kaleb's personal AI command center. The assistant is **Atlas** — an always-on
strategic operator that runs the daily rhythm, surfaces content ideas, tracks
business and trading, and holds the 90-day operating system together.

> The Hermes era (n8n on a Hetzner VPS, `n8n.kalebos.app`, Docker Compose) is
> **retired**. If you are reading this expecting that stack, it is gone — the
> `docker-compose.yml` and `n8n-workflows/` directories are historical. Ingest
> now runs on Vercel crons inside `dashboard/`.

## Stack
- **Next.js 16** app in `dashboard/`, deployed on Vercel (project `kalebos`)
- **Supabase** for all persistence (project ref `eafrjiqjelumqgoefbfd`)
- **OpenRouter** for LLM calls (`src/lib/llm.ts`)
- Web Push for notifications, driven by `/api/cron/tick` every five minutes

## Repo structure
- `dashboard/` — the app. Everything that runs lives here.
- `supabase/migrations/` — DB schema, applied in order
- `prompts/` — Atlas system prompts
- `decisions.md` — locked architectural/behavioral decisions
- `content-engine/` — content pipeline notes
- `docker-compose.yml`, `n8n-workflows/` — retired Hermes-era artifacts

## Season 1 — the 90-day operating system
Runs **Sep 1 → Nov 29, 2026**. One active row in `seasons` at a time.
The point is a lifestyle that is automatic before 2027, optimizing for
**consistency rather than perfection**.

### Six pillars
`DRYP` · `Mind` · `Body` · `Trading` · `Brand` · `Relationships`

Reshaped in `0027_season_pillars.sql`: Money split into DRYP and Trading,
Spirit and Mind merged, Mission became Brand. `src/lib/rhythm/pillars.ts`
resolves the legacy names forever, so old rows keep rendering.

⚠️ `content_ideas.pillar` and `content_scripts.pillar` are a **different
vocabulary** — per-brand content pillars as free text ("Trading Psychology",
"AI Automation"). They are not life pillars and must never be remapped.

### The rhythm lives in code
`src/lib/rhythm/template.ts` is the source of truth for the daily schedule —
not the `schedule_blocks` table. `consistency.ts` derives its denominator from
the same file, so editing the template keeps the score correct automatically.

Weekday: wake 6:00 · meditation · journal/walk/water · trading 7–9 ·
commute 9:15 · DRYP 10–6 (gym floats 11:30–3) · commute home 6–7 ·
flexible personal 7–9:30 (Horizon Walk, sun-anchored) · shutdown 9:30 ·
sleep 10:00.

Gym is mandatory Mon/Tue/Thu/Fri, optional Saturday, and **absent** Wednesday
and Sunday — `templateFor(dayType, dow)` drops the block entirely on rest days
so a rest day cannot cost a point of consistency.

## Known state
- **Migration `0024_rhythm` has never been applied.** `schedule_instances`,
  `horizon_walks` and the journal/schedule_blocks columns it adds do not exist
  in the live database. The app runs on the `kalebos_config` fallback that
  migration documents (`day:<date>`, `horizon_log`). Later migrations are
  written to work with or without it — keep it that way until it is applied.
- Live DB is otherwise at `0023`, plus `0027`.

## Applying a migration
No Postgres URL is stored locally. Use the Supabase management API with
`SUPABASE_ACCESS_TOKEN` from `dashboard/.env.local`:

```
POST https://api.supabase.com/v1/projects/eafrjiqjelumqgoefbfd/database/query
{"query": "<sql>"}
```

Always dry-run first by wrapping the migration in `begin; … rollback;` with a
probe query at the end.

## Locked decisions (see decisions.md)
- Email send requires an explicit approval click — no auto-send, ever
- Notifications 7am–9pm Eastern only; outside hours queue. Quiet hours are
  enforced in `src/lib/rhythm/notify.ts`
- Temporary memory TTL: 60 days, auto-renews +30 days on reference

## Atlas voice
High-level strategic operator. Clear, structured, direct — not emotional.
Every output: what's happening → what matters → what to do next, with a
recommendation and options. Priority order: DRYP → trading → brand → life.

## Before writing app code
`dashboard/AGENTS.md` applies: this Next.js version has breaking changes
against training data. Read the relevant guide in `dashboard/node_modules/next/dist/docs/`
before writing routes or components.
