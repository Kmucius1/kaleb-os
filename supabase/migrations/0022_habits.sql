-- Habit tracking (weekly grid + progress). Binary / count / duration habits.
create table if not exists habits (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  icon       text,                         -- keyword mapped to a glyph in code
  kind       text not null default 'binary', -- binary | count | duration
  target     numeric not null default 1,
  unit       text default '',              -- '', 'g', 'min', 'x'
  step       numeric not null default 1,   -- increment per tap for count/duration
  pillar     text not null default 'Body',
  sort_order int not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists habit_logs (
  id        uuid primary key default gen_random_uuid(),
  habit_id  uuid not null references habits(id) on delete cascade,
  log_date  date not null,
  value     numeric not null default 0,
  done      boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (habit_id, log_date)
);
create index if not exists idx_habit_logs_date on habit_logs(log_date desc);

grant select, insert, update, delete on habits, habit_logs to service_role, authenticated, anon;

insert into habits (name, icon, kind, target, unit, step, pillar, sort_order) values
('Meditate (AM)', 'meditate', 'binary',   1,   '',    1,  'Spirit', 1),
('Meditate (PM)', 'meditate', 'binary',   1,   '',    1,  'Spirit', 2),
('Journal',       'journal',  'binary',   1,   '',    1,  'Spirit', 3),
('Gym',           'gym',      'binary',   1,   '',    1,  'Body',   4),
('Trade Plan',    'trade',    'binary',   1,   '',    1,  'Money',  5),
('Protein Goal',  'protein',  'count',    180, 'g',   20, 'Body',   6),
('Read / Study',  'read',     'duration', 60,  'min', 15, 'Mind',   7),
('Content',       'content',  'binary',   1,   '',    1,  'Mission',8),
('No Alcohol',    'alcohol',  'binary',   1,   '',    1,  'Body',   9);
