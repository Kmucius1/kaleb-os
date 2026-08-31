-- ============================================================================
-- KalebOS — Fuel.
--
-- Photograph the meal, let the model estimate it, correct the portions, save.
--
-- THE ONE RULE THIS SCHEMA ENFORCES
-- A photo produces an estimate, never a measurement. Every meal carries a
-- confidence and a status, and nothing counts toward the day until status is
-- 'confirmed' — i.e. until a human looked at the numbers and agreed. The raw
-- model response is kept so an estimate can always be re-derived or audited
-- rather than trusted on faith.
--
-- WHAT THIS DELIBERATELY DOES NOT ADD
-- No body_metrics table. Body weight, hydration and sleep are already habits
-- ('Body Weight', 'Hydration', 'Sleep') with a value per day in habit_logs.
-- A second home for the same number is how two numbers start disagreeing —
-- Fuel reads the habits it already has.
-- ============================================================================

create table if not exists meals (
  id            uuid primary key default gen_random_uuid(),
  eaten_at      timestamptz not null default now(),
  -- ET calendar date, denormalised so a day's rollup is one indexed read and
  -- never a timezone conversion in a WHERE clause.
  meal_date     date not null,
  slot          text,                       -- breakfast | lunch | dinner | snack
  photo_path    text,                       -- object path in the private 'fuel' bucket
  source        text not null default 'photo',      -- photo | manual
  status        text not null default 'estimated',  -- estimated | confirmed
  -- 0..1, from the model. Never rounded away in the UI.
  confidence    numeric,

  calories         numeric,
  protein_g        numeric,
  carbs_g          numeric,
  fat_g            numeric,
  fiber_g          numeric,
  produce_servings numeric,                 -- fruit + vegetable servings

  note          text,
  ai_model      text,
  ai_raw        jsonb,                      -- the untouched model response
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_meals_date on meals(meal_date desc, eaten_at desc);
create index if not exists idx_meals_status on meals(status, meal_date desc);

do $$ begin
  alter table meals add constraint meals_status_ck check (status in ('estimated', 'confirmed'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table meals add constraint meals_source_ck check (source in ('photo', 'manual'));
exception when duplicate_object then null; end $$;

-- One row per food the model identified. Portions are the thing a human
-- actually corrects, so they are editable and the edit is recorded — a
-- corrected item is evidence about the model, not just a better number.
create table if not exists meal_items (
  id            uuid primary key default gen_random_uuid(),
  meal_id       uuid not null references meals(id) on delete cascade,
  name          text not null,
  qty           numeric,
  unit          text,

  calories         numeric,
  protein_g        numeric,
  carbs_g          numeric,
  fat_g            numeric,
  fiber_g          numeric,
  produce_servings numeric,

  confidence    numeric,
  edited        boolean not null default false,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists idx_meal_items_meal on meal_items(meal_id, sort_order);

alter table meals enable row level security;
alter table meal_items enable row level security;
drop policy if exists meals_all on meals;
create policy meals_all on meals for all using (true) with check (true);
drop policy if exists meal_items_all on meal_items;
create policy meal_items_all on meal_items for all using (true) with check (true);
grant all on meals, meal_items to anon, authenticated, service_role;

-- Keep updated_at honest without the app having to remember.
create or replace function touch_meals_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_meals_updated_at on meals;
create trigger trg_meals_updated_at before update on meals
  for each row execute function touch_meals_updated_at();
