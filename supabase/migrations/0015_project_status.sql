-- Manual status overlay for GitHub-backed Projects hub.
-- Repos are pulled live from GitHub; this table only stores Kaleb's own
-- curation on top (his intent, which raw git activity can't express).
create table if not exists project_status (
  repo        text primary key,          -- GitHub full_name, e.g. "Kmucius1/kaleb-os"
  status      text,                      -- working | live | shelved | idea (null = auto by activity)
  pinned      boolean not null default false,
  note        text,
  updated_at  timestamptz not null default now()
);
