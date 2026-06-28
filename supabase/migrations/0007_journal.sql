-- Spirituality / meditation journal for the morning ritual.
create table if not exists journal (
  id         uuid primary key default gen_random_uuid(),
  kind       text default 'meditation',   -- 'meditation' | 'reflection' | 'gratitude' | 'note'
  mood       text,
  content    text not null,
  entry_date date default current_date,
  created_at timestamptz default now()
);
create index if not exists idx_journal_date on journal (entry_date desc, created_at desc);
alter table journal enable row level security;
grant select, insert, update, delete on journal to service_role, authenticated;
