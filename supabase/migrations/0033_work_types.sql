-- ============================================================================
-- KalebOS — reading the office day for leverage.
--
-- DRYP work splits four ways:
--   ceo         the work only he can do — strategy, pricing, positioning,
--               hiring, partnerships, the decisions
--   builder     making the thing — code, systems, design, writing
--   management  running people and clients — meetings, follow-ups, reviews
--   admin       the pile that keeps the lights on and buys back the most time
--               when it goes
--
-- The point is not classification for its own sake. It is to make the admin
-- and management piles visible enough to hand off, so the office day trends
-- toward CEO and Builder over the season.
--
-- NOTE ON THE CHECK: it permits NULL. 424 open tasks predate this column, and
-- a constraint that rejected the unclassified ones would silently fail every
-- write that touched an old row — which is exactly how the priority CHECK in
-- the triage migration ate every value above 6.
-- ============================================================================

alter table tasks add column if not exists work_type text;
alter table tasks add column if not exists delegable boolean;
-- Set when a human overrides the classifier, so a backfill never undoes a
-- deliberate correction.
alter table tasks add column if not exists work_type_locked boolean not null default false;

do $$ begin
  alter table tasks add constraint tasks_work_type_ck
    check (work_type is null or work_type in ('ceo', 'builder', 'management', 'admin'));
exception when duplicate_object then null; end $$;

create index if not exists idx_tasks_work_type on tasks(work_type, status) where status in ('pending', 'in_progress');
create index if not exists idx_tasks_delegable on tasks(delegable) where delegable = true;
