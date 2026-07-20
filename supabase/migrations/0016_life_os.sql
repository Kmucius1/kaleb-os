-- ============================================================================
-- KalebOS Life OS — the schedule as law, the six pillars, the three rules.
-- "My values run my life. My schedule protects my values."
-- ============================================================================

-- Recurring daily template (the default rhythm). Source of truth for the
-- /schedule timeline AND for block-start push notifications.
create table if not exists schedule_blocks (
  id          uuid primary key default gen_random_uuid(),
  day_type    text not null,               -- weekday | saturday | sunday
  sort_order  int  not null,
  start_min   int  not null,               -- minutes since midnight (ET)
  end_min     int  not null,
  title       text not null,
  pillar      text not null,               -- Spirit | Mind | Body | Money | Mission | Relationships
  identity    text,                        -- e.g. "Trader"
  detail      text,
  rotates     text,                        -- null | commute | study | content (theme resolved by weekday)
  notify      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists idx_schedule_blocks_day on schedule_blocks(day_type, start_min);

-- One-off dated personal events (KalebOS is the personal calendar, not Google).
create table if not exists schedule_events (
  id          uuid primary key default gen_random_uuid(),
  event_date  date not null,
  start_min   int,                         -- null = all-day
  end_min     int,
  title       text not null,
  pillar      text,
  location    text,
  note        text,
  source      text default 'atlas',        -- atlas | manual | gcal
  notify      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists idx_schedule_events_date on schedule_events(event_date);

-- Old generic check-in notifications are superseded by the real schedule.
update notification_schedule set active = false;

-- ---------------------------------------------------------------------------
-- Seed the weekday rhythm (Mon–Fri).
-- ---------------------------------------------------------------------------
insert into schedule_blocks (day_type, sort_order, start_min, end_min, title, pillar, identity, detail, rotates, notify) values
('weekday', 1,  165, 180,  'Wake Up',            'Body',   'Trader', 'Water. Brush teeth. Get ready. No social media. Review today''s trading plan.', null, true),
('weekday', 2,  180, 300,  'Trading',            'Money',  'Trader', 'Execute only A+ setups. While waiting: review previous trades, study price action, build the MT4 bot, improve systems. No scrolling.', null, true),
('weekday', 3,  300, 320,  'Trading Journal',    'Money',  null,     'Did I follow my plan? What emotions showed up? What did I learn? What gets improved tomorrow?', null, true),
('weekday', 4,  320, 350,  'Meditation',         'Spirit', null,     '30 minutes. Silence. No phone. No notifications.', null, true),
('weekday', 5,  360, 435,  'Gym',                'Body',   null,     'Lift. Progressive overload. Track workouts. Protein immediately after.', null, true),
('weekday', 6,  435, 465,  'Beach Walk',         'Spirit', null,     'Watch the sunrise. No headphones 2–3 days a week. "I moved here on purpose."', null, true),
('weekday', 7,  465, 495,  'Breakfast',          'Body',   null,     'Eat. Hydrate. Recover.', null, false),
('weekday', 8,  495, 585,  'Recovery Sleep',     'Body',   null,     '90-minute sleep cycle. Treat it like a meeting. Protect it.', null, true),
('weekday', 9,  585, 600,  'Prepare',            'Mind',   null,     'Shower. Get dressed. Morning Brief. Today''s Top 3.', null, true),
('weekday', 10, 600, 640,  'Commute — Learning', 'Mind',   null,     'University on Wheels. One direction is for learning.', 'commute', true),
('weekday', 11, 640, 1020, 'DRYP Digital',       'Money',  null,     'Mission Mode. Client work, sales, meetings, CRM, software, AI systems, team, proposals. One ranked priority list — no bouncing around.', null, true),
('weekday', 12, 1020,1060, 'Commute — Reflection','Spirit',null,     'No learning. Reflect: What moved the business forward? What slowed you down? What deserves tomorrow''s attention? Arrive home with the workday mentally finished.', null, true),
('weekday', 13, 1060,1110, 'Deep Study',         'Mind',   null,     'Rotate focus.', 'study', true),
('weekday', 14, 1110,1170, 'Asset Building',     'Mission',null,     'Freedom Block. Only assets — KalebOS, MT4 bot, TikTok Shop automation, dropshipping, SaaS, DRYP products. Systems that create value when you are not working.', null, true),
('weekday', 15, 1170,1215, 'Content Studio',     'Mission',null,     'Record. Edit. Post. Study analytics. Write scripts. Batch. You are building a media company.', 'content', true),
('weekday', 16, 1215,1235, 'Dinner',             'Body',   null,     'Slow down. Eat. No rushing.', null, false),
('weekday', 17, 1235,1250, 'Meditation',         'Spirit', null,     'Release the day. Become still.', null, true),
('weekday', 18, 1250,1260, 'Evening Journal',    'Spirit', null,     'What am I grateful for? What did I build? Who did I become? What is tomorrow''s focus?', null, true),
('weekday', 19, 1260,1440, 'Sleep',              'Body',   null,     'Sleep. Repeat.', null, true);

-- ---------------------------------------------------------------------------
-- Saturday — identical morning, then creative + life.
-- ---------------------------------------------------------------------------
insert into schedule_blocks (day_type, sort_order, start_min, end_min, title, pillar, identity, detail, rotates, notify) values
('saturday', 1, 165, 180,  'Wake Up',        'Body',   'Trader', 'Water. Get ready. Review trading plan.', null, true),
('saturday', 2, 180, 300,  'Trading',        'Money',  'Trader', 'A+ setups only.', null, true),
('saturday', 3, 300, 350,  'Journal + Meditation','Spirit',null, 'Trading journal, then 30 minutes of silence.', null, true),
('saturday', 4, 360, 435,  'Gym',            'Body',   null,     'Lift. Progressive overload. Protein after.', null, true),
('saturday', 5, 435, 495,  'Beach Walk',     'Spirit', null,     'Sunrise. Presence. "I moved here on purpose."', null, true),
('saturday', 6, 600, 1020, 'Creative + Explore','Mission',null,  'Long-form YouTube. Film lifestyle. Explore Florida. Networking. Creative work.', null, true),
('saturday', 7, 1020,1320, 'Enjoy Life',     'Relationships',null,'Sunset. Friends. Family. Date night. Relax.', null, true);

-- ---------------------------------------------------------------------------
-- Sunday — identical morning, then Reset Day.
-- ---------------------------------------------------------------------------
insert into schedule_blocks (day_type, sort_order, start_min, end_min, title, pillar, identity, detail, rotates, notify) values
('sunday', 1, 165, 180,  'Wake Up',       'Body',   'Trader', 'Water. Get ready. Review trading plan.', null, true),
('sunday', 2, 180, 300,  'Trading',       'Money',  'Trader', 'A+ setups only.', null, true),
('sunday', 3, 300, 350,  'Journal + Meditation','Spirit',null, 'Trading journal, then 30 minutes of silence.', null, true),
('sunday', 4, 360, 435,  'Gym',           'Body',   null,     'Lift. Progressive overload. Protein after.', null, true),
('sunday', 5, 435, 495,  'Beach Walk',    'Spirit', null,     'Sunrise. Presence.', null, true),
('sunday', 6, 600, 780,  'Weekly Review', 'Mind',   null,     'Review: trading stats, revenue, DRYP, clients, fitness, weight, meditation streak, journal insights, content analytics.', null, true),
('sunday', 7, 780, 1020, 'Reset & Prep',  'Mission',null,     'Grocery shop. Laundry. Meal prep. Clean apartment. Prepare clothes. Prepare calendar. Review KalebOS weekly report.', null, true),
('sunday', 8, 1020,1320, 'Rest & Prepare','Spirit', null,     'Start Monday with zero friction.', null, true);

-- ---------------------------------------------------------------------------
-- Config: the law — pillars, rules, rotations, themes, philosophy.
-- ---------------------------------------------------------------------------
insert into kalebos_config (key, value) values
('pillars', '[{"name":"Spirit","color":"#8b5cf6","of":"Meditation, journaling, silence, reflection, beach walks, presence, gratitude"},{"name":"Mind","color":"#3b82f6","of":"Learning, AI, trading study, reading, courses, thinking, problem solving"},{"name":"Body","color":"#10b981","of":"Sleep, recovery, gym, nutrition, hydration, weight, mobility, health"},{"name":"Money","color":"#f59e0b","of":"DRYP Digital, trading, investments, new businesses, revenue, cash flow"},{"name":"Mission","color":"#ec4899","of":"Content, KalebOS, products, automation, systems, long-term leverage, assets"},{"name":"Relationships","color":"#14b8a6","of":"Family, friends, partners, clients, networking, LinkedUp"}]'),
('rules', '[{"n":1,"title":"Protect the Morning","body":"Nobody gets your mornings. No meetings. No exceptions unless truly urgent."},{"n":2,"title":"Afternoons Create Income","body":"DRYP. Clients. Systems. Sales."},{"n":3,"title":"Evenings Build Freedom","body":"The Freedom Block. Build things that eventually buy back your time."}]'),
('commute_themes', '{"1":"AI Podcast","2":"Trading Psychology","3":"Business Strategy","4":"Marketing / Social Media","5":"Spiritual / Philosophy"}'),
('study_rotation', '{"1":"AI","2":"Trading","3":"AI","4":"Trading","5":"Business"}'),
('content_themes', '{"0":"Weekly Reset","1":"Mindset","2":"Business","3":"AI","4":"Trading","5":"Personal Story","6":"Lifestyle"}'),
('asset_projects', '["KalebOS","MT4 Trading Bot","TikTok Shop Automation","Dropshipping AI","New SaaS Ideas","DRYP Internal Products"]'),
('schedule_philosophy', 'My values run my life. My schedule protects my values. This is my monastery — every hour exists to help me become the man I have already decided to be.'),
('schedule_start_date', '2026-08-01')
on conflict (key) do update set value = excluded.value;

-- Back up the current Atlas persona before installing the KalebOS law.
insert into kalebos_config (key, value)
select 'persona_backup_pre_lifeos', value from kalebos_config where key = 'persona'
on conflict (key) do nothing;
