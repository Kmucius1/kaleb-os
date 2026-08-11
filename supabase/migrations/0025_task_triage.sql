-- 0025 — Task triage.
--
-- The tasks table had exactly one signal (created_at) and 306 rows, every one of
-- them status='pending' with the default priority of 6. PLAUD ingest files an
-- action item for every action-ish sentence in a transcript, so the list was
-- mostly other people's business ("collect driver's licenses for the other two
-- owners", "bring more chairs to the office") sitting at the same weight as
-- Kaleb's own commitments.
--
-- Two axes fix that: WHOSE is it (owner) and DOES IT MATTER (priority, now
-- actually populated). Everything else here exists to support triage.

alter table tasks add column if not exists owner        text;   -- 'kaleb' | 'team' | 'other'
alter table tasks add column if not exists area         text;   -- dryp | ehm | kaleb-os | clients | personal | trading | admin
alter table tasks add column if not exists source       text;   -- capture/recording this came from
alter table tasks add column if not exists dedupe_key   text;   -- normalized title, for write-time dedup
alter table tasks add column if not exists dismissed_at timestamptz;
alter table tasks add column if not exists triaged_at   timestamptz;

comment on column tasks.owner    is 'kaleb = his own commitment; team = delegated/someone he manages; other = another party''s action item, kept for reference only';
comment on column tasks.priority is '1-10, higher = more important. >=7 Now, 4-6 Soon, <=3 Someday. 6 on an untriaged row is the legacy default, not a judgement.';

-- Everything that already exists predates triage.
update tasks set triaged_at = null where triaged_at is not null and owner is null;

create index if not exists tasks_open_idx  on tasks (status, owner, priority desc);
create index if not exists tasks_dedupe_idx on tasks (dedupe_key) where status = 'pending';
