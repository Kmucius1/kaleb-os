-- Web Push notifications + mood/feeling tracking + reminders.

-- Device push subscriptions (one row per installed PWA / browser).
create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  endpoint   text unique not null,
  p256dh     text not null,
  auth       text not null,
  ua         text,
  created_at timestamptz default now()
);
alter table push_subscriptions enable row level security;
grant select, insert, update, delete on push_subscriptions to service_role, authenticated;

-- Mood / mindset check-ins (the "how am I feeling" tracking layer).
create table if not exists mood_checkins (
  id         uuid primary key default gen_random_uuid(),
  mood       text,                       -- great | good | ok | low | stressed | tired ...
  score      int,                        -- 1..5 quick scale
  energy     int,                        -- 1..5 optional
  note       text,                       -- free-form how/why
  context    text,                       -- what they were doing
  source     text default 'checkin',     -- checkin | atlas | notification
  created_at timestamptz default now()
);
create index if not exists idx_mood_created on mood_checkins (created_at desc);
alter table mood_checkins enable row level security;
grant select, insert, update, delete on mood_checkins to service_role, authenticated;

-- One-off, time-based reminders (Atlas: "remind me at 3pm to ...").
create table if not exists reminders (
  id         uuid primary key default gen_random_uuid(),
  message    text not null,
  due_at     timestamptz not null,
  sent       boolean default false,
  source     text default 'atlas',
  created_at timestamptz default now()
);
create index if not exists idx_reminders_due on reminders (due_at) where sent = false;
alter table reminders enable row level security;
grant select, insert, update, delete on reminders to service_role, authenticated;

-- Recurring daily notification schedule (editable). Times are America/New_York HH:MM.
create table if not exists notification_schedule (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null,              -- meditation | journal | custom
  label      text,
  time_et    text not null,              -- 'HH:MM' 24h, ET
  title      text not null,
  body       text,
  deep_link  text default '/',
  active     boolean default true,
  created_at timestamptz default now()
);
alter table notification_schedule enable row level security;
grant select, insert, update, delete on notification_schedule to service_role, authenticated;

-- Dedup log so each scheduled item / event fires at most once per day.
create table if not exists notification_log (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null,              -- schedule | reminder | lead | approval | brief | test
  ref        text not null,              -- schedule id / lead id / reminder id / etc.
  day        date not null default current_date,
  title      text,
  body       text,
  created_at timestamptz default now(),
  unique (kind, ref, day)
);
alter table notification_log enable row level security;
grant select, insert, update, delete on notification_log to service_role, authenticated;

-- Seed the meditation + journal/feeling cadence (3 each). Edit times anytime.
insert into notification_schedule (kind, label, time_et, title, body, deep_link) values
  ('meditation', 'Morning meditation', '09:00', '🧘 Meditate',        'Take 10 minutes to sit and breathe before the day pulls at you.', '/dashboard'),
  ('meditation', 'Midday reset',       '13:00', '🧘 Midday reset',    'Pause. Three slow breaths. Reset your focus.',                    '/dashboard'),
  ('meditation', 'Evening calm',       '19:00', '🧘 Evening calm',    'Wind down with a short meditation.',                              '/dashboard'),
  ('journal',    'Morning mindset',    '11:00', '📝 How are you feeling?', 'Quick check-in — log your mindset right now.',                '/feeling'),
  ('journal',    'Afternoon check-in', '15:00', '📝 Mindset check-in',     'How''s your energy and focus this afternoon?',                '/feeling'),
  ('journal',    'Evening reflection', '21:00', '📝 Evening reflection',   'How did today feel? Reflect before bed.',                     '/feeling')
on conflict do nothing;
