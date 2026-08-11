-- 0026 — Make the constraints match the triage scale.
--
-- 0025 added the triage columns but not the two CHECKs that govern them, which
-- were written long before triage existed:
--
--   tasks_priority_check  priority between 1 and 6
--   tasks_status_check    status in (pending, in_progress, completed, cancelled)
--
-- The first one silently ate the entire top of the backfill — every task the
-- model scored 7 or above failed its write and stayed untriaged, so the Now
-- bucket came back empty while 76 tasks landed in Someday. The second would
-- have made the dismiss button 500 on every click.
--
-- Triage scores 1-10 (>=8 Now, 5-7 Soon, <=4 Someday), and dismissing a task is
-- distinct from cancelling one: cancelled means the work is off, dismissed means
-- it was never his to begin with.

alter table tasks drop constraint if exists tasks_priority_check;
alter table tasks add  constraint tasks_priority_check check (priority >= 1 and priority <= 10);

alter table tasks drop constraint if exists tasks_status_check;
alter table tasks add  constraint tasks_status_check
  check (status in ('pending', 'in_progress', 'completed', 'cancelled', 'dismissed'));
