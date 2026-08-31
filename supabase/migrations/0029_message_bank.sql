-- ============================================================================
-- KalebOS — the notification message bank.
--
-- The pipeline already decides *when* to interrupt (cron/tick every five
-- minutes, quiet hours, once-per-day dedup). This gives it something worth
-- saying, and more than one way to say it: a notification you have read forty
-- times is wallpaper, and wallpaper is easy to swipe away.
--
-- Lines are picked deterministically from the date and the slot, so a given day
-- always says the same thing (a second cron tick cannot contradict the first)
-- while consecutive days differ. Adding a line is an insert — no deploy.
-- ============================================================================

create table if not exists notification_messages (
  id         uuid primary key default gen_random_uuid(),
  slot       text not null,          -- morning | trading | gym | content | evening | sleep
  text       text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  unique (slot, text)
);
create index if not exists idx_notification_messages_slot on notification_messages(slot) where active;

alter table notification_messages enable row level security;
drop policy if exists notification_messages_all on notification_messages;
create policy notification_messages_all on notification_messages for all using (true) with check (true);
grant all on notification_messages to anon, authenticated, service_role;

-- The six Kaleb wrote come first in each slot, with variants behind them so a
-- working week never repeats a line.
insert into notification_messages (slot, text) values
  ('morning',  'You get your mind before the world gets you.'),
  ('morning',  'The first hour is yours. Nobody else gets it.'),
  ('morning',  'Win the morning quietly and the day follows.'),
  ('morning',  'No phone. No noise. Just you and the plan.'),
  ('morning',  'The man you are becoming starts at six.'),

  ('trading',  'Show up to the market. You don''t have to force a trade. Master the craft.'),
  ('trading',  'No setup is also a decision. Sit on your hands.'),
  ('trading',  'You are paid for patience, not for activity.'),
  ('trading',  'Two hours. Process over profit.'),
  ('trading',  'Grade the plan, not the outcome.'),

  ('gym',      'Today''s body is tomorrow''s mirror. Go train.'),
  ('gym',      'Progressive overload. Add something to the bar.'),
  ('gym',      'Nobody is coming to lift it for you.'),
  ('gym',      'It is already on the calendar. Just go.'),
  ('gym',      'You don''t skip the thing that builds the man.'),

  ('content',  'Two posts. That''s it. Distribution compounds.'),
  ('content',  'Ship it imperfect. Reach beats polish.'),
  ('content',  'Say the thing you would have wanted to hear.'),
  ('content',  'The archive only grows if you post.'),
  ('content',  'Two a day, fourteen a week. That is the whole game.'),

  ('evening',  'Did today move the man forward?'),
  ('evening',  'Close the laptop. Close the day.'),
  ('evening',  'What did you build? Who did you become?'),
  ('evening',  'Shutdown means shutdown.'),
  ('evening',  'The day is over. Let it be over.'),

  ('sleep',    'Tomorrow''s discipline starts with tonight''s sleep.'),
  ('sleep',    'Eight hours is the plan, not the luxury.'),
  ('sleep',    'You cannot out-train bad sleep.'),
  ('sleep',    'Lights out. Six o''clock comes either way.'),
  ('sleep',    'Protect the wake-up.')
on conflict (slot, text) do nothing;
