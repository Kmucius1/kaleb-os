-- ============================================================================
-- KalebOS — the adaptive rhythm.
--
-- "My values run my life. My schedule protects my values."
--
-- Three things this adds:
--   1. Block metadata the adaptive engine needs (flexibility, durations,
--      energy, travel, priority) on the recurring template.
--   2. A real separation between the template and dated instances, so a day can
--      be rebalanced without ever mutating the rhythm itself.
--   3. First-class Horizon Walk tracking and richer journal entries.
--
-- Interim note: until this migration is applied, the app stores per-day
-- overrides in kalebos_config under `day:<date>` and Horizon check-ins under
-- `horizon_log`. src/lib/rhythm/day.ts reads both through accessors, so the
-- switch-over is a single-file change.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Template metadata
-- ---------------------------------------------------------------------------
alter table schedule_blocks add column if not exists block_key    text;
alter table schedule_blocks add column if not exists pillar2      text;
alter table schedule_blocks add column if not exists kind         text default 'ritual';
alter table schedule_blocks add column if not exists flexibility  text not null default 'flexible';
alter table schedule_blocks add column if not exists priority     int  not null default 3;
alter table schedule_blocks add column if not exists min_minutes  int;
alter table schedule_blocks add column if not exists pref_minutes int;
alter table schedule_blocks add column if not exists energy       text default 'medium';
alter table schedule_blocks add column if not exists location     text;
alter table schedule_blocks add column if not exists travel_min   int;
alter table schedule_blocks add column if not exists sun_anchored text;
alter table schedule_blocks add column if not exists notes        text;

do $$ begin
  alter table schedule_blocks
    add constraint schedule_blocks_flexibility_ck
    check (flexibility in ('protected', 'flexible', 'movable'));
exception when duplicate_object then null; end $$;

-- block_key is the stable slug the engine uses (survives reseeds).
create unique index if not exists idx_schedule_blocks_key on schedule_blocks(day_type, block_key)
  where block_key is not null;

-- ---------------------------------------------------------------------------
-- 2) Dated instances — one row per block per real day, freely movable.
-- ---------------------------------------------------------------------------
create table if not exists schedule_instances (
  id           uuid primary key default gen_random_uuid(),
  instance_date date not null,
  block_key    text not null,             -- slug from the template, or event:<uuid>
  title        text not null,
  pillar       text not null,
  pillar2      text,
  identity     text,
  kind         text not null default 'ritual',
  start_min    int  not null,
  end_min      int  not null,
  flexibility  text not null default 'flexible',
  priority     int  not null default 3,
  min_minutes  int,
  pref_minutes int,
  energy       text default 'medium',
  location     text,
  travel_min   int,
  deadline     timestamptz,
  depends_on   text[],                    -- block_keys that must finish first
  status       text not null default 'planned',  -- planned|current|done|skipped|missed
  locked       boolean not null default false,
  moved_from_start int,                   -- set when the engine moved it
  moved_from_end   int,
  reason       text,                      -- why it moved / was skipped
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (instance_date, block_key)
);
create index if not exists idx_schedule_instances_date on schedule_instances(instance_date, start_min);

do $$ begin
  alter table schedule_instances
    add constraint schedule_instances_status_ck
    check (status in ('planned', 'current', 'done', 'skipped', 'missed'));
exception when duplicate_object then null; end $$;

alter table schedule_instances enable row level security;
drop policy if exists schedule_instances_all on schedule_instances;
create policy schedule_instances_all on schedule_instances for all using (true) with check (true);
grant all on schedule_instances to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Horizon Walk — the daily beach ritual, minimum five of seven.
-- ---------------------------------------------------------------------------
create table if not exists horizon_walks (
  id          uuid primary key default gen_random_uuid(),
  walk_date   date not null unique,
  window      text not null,              -- sunrise | sunset
  sun_min     int,                        -- the sun moment it was built around
  start_min   int,
  duration_min int,
  -- how it was confirmed: manual | location | photo | voice | went
  method      text not null default 'manual',
  mode        text,                       -- silence | walking-meditation | gratitude
                                          -- | voice-journal | content | recovery | watch
  note        text,
  photo_url   text,
  journal_id  uuid,
  created_at  timestamptz not null default now()
);
create index if not exists idx_horizon_walks_date on horizon_walks(walk_date desc);
alter table horizon_walks enable row level security;
drop policy if exists horizon_walks_all on horizon_walks;
create policy horizon_walks_all on horizon_walks for all using (true) with check (true);
grant all on horizon_walks to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) Journal — three daily moments, voice-first, with extracted structure.
-- ---------------------------------------------------------------------------
alter table journal add column if not exists moment     text;   -- morning | midday | evening
                                                                -- | trading | idea | gratitude
                                                                -- | win | lesson | freeform
alter table journal add column if not exists transcript text;   -- raw speech-to-text
alter table journal add column if not exists audio_url  text;
alter table journal add column if not exists summary    text;   -- AI summary
alter table journal add column if not exists energy     int;    -- 1..5
alter table journal add column if not exists pillar     text;
alter table journal add column if not exists tags       text[];
-- Extracted entities, all optional, all reviewable before they become commitments:
-- { people:[], projects:[], goals:[], decisions:[], ideas:[], wins:[],
--   frustrations:[], commitments:[], followups:[] }
alter table journal add column if not exists entities   jsonb default '{}'::jsonb;
create index if not exists idx_journal_moment on journal(moment, entry_date desc);

-- ---------------------------------------------------------------------------
-- 5) Config for the new rhythm.
-- ---------------------------------------------------------------------------
insert into kalebos_config (key, value) values
  ('horizon_prefs', '{"preference":"either","durationMinutes":45,"travelMinutes":12}'),
  ('commute_minutes', '{"min":30,"max":40,"planWith":40}'),
  ('sleep_policy', '{"wake":"06:00","target":"21:45","latest":"22:00","minHours":8}'),
  ('schedule_philosophy', 'My values run my life. My schedule protects my values.')
on conflict (key) do update set value = excluded.value;
