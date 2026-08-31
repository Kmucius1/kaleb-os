-- ============================================================================
-- KalebOS — the Saturday content batch.
--
-- Fourteen talking-head videos a week, two a day. The generator already
-- existed; what was missing is the ritual that turns it into a scheduled week:
-- generate 28, select 14, record, schedule.
--
-- Twenty-eight is deliberate. Choosing 14 from 28 is a real edit — half get
-- cut — whereas generating exactly 14 would make "select" a rubber stamp.
-- ============================================================================

create table if not exists content_batches (
  id           uuid primary key default gen_random_uuid(),
  /** Monday of the week this batch will be POSTED (the batch is built the
      Saturday before). */
  week_start   date not null unique,
  status       text not null default 'generating',  -- generating|selecting|recording|scheduled
  target       int  not null default 14,
  generated    int  not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_content_batches_week on content_batches(week_start desc);

do $$ begin
  alter table content_batches add constraint content_batches_status_ck
    check (status in ('generating', 'selecting', 'recording', 'scheduled'));
exception when duplicate_object then null; end $$;

-- Ideas join a batch, get picked, get recorded, get a slot.
alter table content_ideas add column if not exists batch_id      uuid references content_batches(id) on delete set null;
alter table content_ideas add column if not exists selected      boolean not null default false;
alter table content_ideas add column if not exists recorded_at   timestamptz;
alter table content_ideas add column if not exists scheduled_for timestamptz;
-- Where the idea came from in his actual week, so a batch is traceable back to
-- the journal entry or trade that prompted it.
alter table content_ideas add column if not exists source_note   text;

create index if not exists idx_content_ideas_batch on content_ideas(batch_id, selected);
create index if not exists idx_content_ideas_scheduled on content_ideas(scheduled_for) where scheduled_for is not null;

alter table content_batches enable row level security;
drop policy if exists content_batches_all on content_batches;
create policy content_batches_all on content_batches for all using (true) with check (true);
grant all on content_batches to anon, authenticated, service_role;

-- Two posts a day, at the times he actually posts.
insert into kalebos_config (key, value) values
  ('content_post_times', '["09:00","18:00"]'),
  ('content_weekly_target', '14')
on conflict (key) do update set value = excluded.value;
