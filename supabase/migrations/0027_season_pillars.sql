-- ============================================================================
-- KalebOS — Season 1, and the pillar set it runs on.
--
-- "Optimize for consistency rather than perfection."
--
-- Two things:
--   1. A season: a bounded 90-day run with a start, an end and a percentage.
--      Everything the Today dashboard reports is measured against one of these.
--   2. The pillar reshape. Money splits into DRYP and Trading (they are
--      different crafts and deserve different scoreboards), Spirit and Mind
--      merge, Mission becomes Brand, Relationships is unchanged.
--
-- The remap is a value migration, not a restructure: no column changes shape,
-- and lib/rhythm/pillars.ts keeps resolving the legacy names forever, so a row
-- this migration misses still renders correctly instead of falling back.
--
-- TWO THINGS THIS MIGRATION DELIBERATELY DOES NOT TOUCH
--
--   * schedule_instances, horizon_walks and the journal/schedule_blocks columns
--     added by 0024_rhythm. That migration has never been applied to this
--     database — the app runs on the kalebos_config fallback it documents. Every
--     statement below is guarded, so this applies cleanly whether 0024 lands
--     before it, after it, or never.
--
--   * content_ideas.pillar / content_scripts.pillar. Despite the shared column
--     name these are NOT life pillars — they hold per-brand content pillars as
--     free text ("Trading Psychology", "AI Automation", "Spirituality / Presence
--     / Inner Work"). Remapping them would corrupt the content engine's
--     taxonomy. They are a separate vocabulary and stay untouched.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Seasons
-- ---------------------------------------------------------------------------
create table if not exists seasons (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  start_date  date not null,
  end_date    date not null,
  goal        text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  check (end_date > start_date)
);
create index if not exists idx_seasons_active on seasons(active, start_date desc);

-- Only one season runs at a time; the dashboard reads exactly one row.
create unique index if not exists idx_seasons_one_active on seasons(active) where active;

alter table seasons enable row level security;
drop policy if exists seasons_all on seasons;
create policy seasons_all on seasons for all using (true) with check (true);
grant all on seasons to anon, authenticated, service_role;

insert into seasons (name, start_date, end_date, goal, active)
select 'Season 1', date '2026-09-01', date '2026-11-29',
       'Build a lifestyle that is automatic before 2027. Consistency over perfection.',
       true
where not exists (select 1 from seasons where name = 'Season 1');

-- ---------------------------------------------------------------------------
-- 2) Pillar remap
--
-- Trading is pulled out of Money first, by block key and by title, so the
-- broader Money→DRYP sweep that follows does not swallow it.
-- ---------------------------------------------------------------------------
do $$
declare
  has_block_key boolean;
begin
  -- --- schedule_blocks (34 rows today) -------------------------------------
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'schedule_blocks' and column_name = 'block_key'
  ) into has_block_key;

  if has_block_key then
    update schedule_blocks set pillar = 'Trading'
      where pillar = 'Money' and (block_key in ('trading', 'trading-review') or title ilike '%trading%');
  else
    update schedule_blocks set pillar = 'Trading'
      where pillar = 'Money' and title ilike '%trading%';
  end if;

  update schedule_blocks set pillar = 'DRYP'  where pillar = 'Money';
  update schedule_blocks set pillar = 'Mind'  where pillar = 'Spirit';
  update schedule_blocks set pillar = 'Brand' where pillar = 'Mission';

  -- pillar2 arrives with 0024; only touch it if it is actually there.
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'schedule_blocks' and column_name = 'pillar2'
  ) then
    update schedule_blocks set pillar2 = 'DRYP'  where pillar2 = 'Money';
    update schedule_blocks set pillar2 = 'Mind'  where pillar2 = 'Spirit';
    update schedule_blocks set pillar2 = 'Brand' where pillar2 = 'Mission';
  end if;

  -- --- schedule_events -----------------------------------------------------
  update schedule_events set pillar = 'DRYP'  where pillar = 'Money';
  update schedule_events set pillar = 'Mind'  where pillar = 'Spirit';
  update schedule_events set pillar = 'Brand' where pillar = 'Mission';

  -- --- habits (12 rows today) ---------------------------------------------
  -- "Trade Plan" is the one Money habit that belongs to Trading.
  update habits set pillar = 'Trading' where pillar = 'Money' and name ilike '%trade%';
  update habits set pillar = 'DRYP'  where pillar = 'Money';
  update habits set pillar = 'Mind'  where pillar = 'Spirit';
  update habits set pillar = 'Brand' where pillar = 'Mission';

  -- --- schedule_instances (only exists once 0024 is applied) ---------------
  if to_regclass('public.schedule_instances') is not null then
    update schedule_instances set pillar = 'Trading'
      where pillar = 'Money' and (block_key in ('trading', 'trading-review') or title ilike '%trading%');
    update schedule_instances set pillar = 'DRYP'  where pillar = 'Money';
    update schedule_instances set pillar = 'Mind'  where pillar = 'Spirit';
    update schedule_instances set pillar = 'Brand' where pillar = 'Mission';
    update schedule_instances set pillar2 = 'DRYP'  where pillar2 = 'Money';
    update schedule_instances set pillar2 = 'Mind'  where pillar2 = 'Spirit';
    update schedule_instances set pillar2 = 'Brand' where pillar2 = 'Mission';
  end if;

  -- --- journal.pillar (also arrives with 0024) -----------------------------
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'journal' and column_name = 'pillar'
  ) then
    update journal set pillar = 'DRYP'  where pillar = 'Money';
    update journal set pillar = 'Mind'  where pillar = 'Spirit';
    update journal set pillar = 'Brand' where pillar = 'Mission';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3) Config: the pillars themselves, and the policies the engine reads.
-- ---------------------------------------------------------------------------
insert into kalebos_config (key, value) values
('pillars', '[
  {"name":"DRYP","color":"#fbbf24","of":"The company, the mission, the wealth engine. Clients, revenue, sales, systems, team, products."},
  {"name":"Mind","color":"#a78bfa","of":"Meditation, journaling, reflection, spiritual learning, mental clarity, emotional awareness, study, presence."},
  {"name":"Body","color":"#34d399","of":"Strength training, muscle, nutrition, protein, sleep, hydration, grooming, appearance, physical confidence."},
  {"name":"Trading","color":"#60a5fa","of":"Daily market participation, analysis, trading journal, psychology, education, backtesting, trading AI and software."},
  {"name":"Brand","color":"#fb923c","of":"Talking-head content, distribution, social growth, audience, the ideas and the life going out consistently."},
  {"name":"Relationships","color":"#f472b6","of":"Family, friends, business partners, clients, networking, intentional social time."}
]'),
('gym_policy', '{"mandatory":[1,2,4,5],"optional":[6],"rest":[0,3],"windowStart":690,"windowEnd":900,"minMinutes":60,"prefMinutes":75}'),
('sleep_policy', '{"wake":"06:00","target":"22:00","latest":"22:30","minHours":8}'),
('commute_minutes', '{"min":30,"max":45,"planWith":45}'),
('schedule_philosophy', 'Optimize for consistency, not perfection. The schedule protects the values; the values run the life.')
on conflict (key) do update set value = excluded.value;
