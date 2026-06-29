-- Dedup ledger for the PLAUD auto-pipe.
-- One row per PLAUD recording that has been filed into Kaleb OS, so the
-- sync never ingests the same recording twice (idempotent by file_id).
create table if not exists plaud_ingested (
  file_id      text primary key,        -- PLAUD recording id
  name         text,                    -- recording name (for the log)
  recorded_at  timestamptz,             -- when PLAUD recorded it
  summary      text,                    -- Atlas's "what I filed" recap
  filed        int default 0,           -- # of records created from it
  ingested_at  timestamptz default now()
);
create index if not exists idx_plaud_ingested_at on plaud_ingested (ingested_at desc);
alter table plaud_ingested enable row level security;
grant select, insert, update, delete on plaud_ingested to service_role, authenticated;
