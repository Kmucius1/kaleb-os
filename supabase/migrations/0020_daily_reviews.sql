-- Generated daily briefings + evening reviews (the daily loop).
create table if not exists daily_reviews (
  id            uuid primary key default gen_random_uuid(),
  review_date   date not null,
  type          text not null,          -- morning | evening
  headline      text,
  identity_line text,
  top3          jsonb,                   -- ["...", "...", "..."]
  focus         text,                    -- morning: focus of the day
  score         int,                     -- evening: 1-10 daily score
  body          text,                    -- full markdown brief/review
  data          jsonb,                   -- raw gathered context (transparency)
  created_at    timestamptz not null default now(),
  unique (review_date, type)
);
create index if not exists idx_daily_reviews_date on daily_reviews(review_date desc);

-- Kaleb's location for weather + sunrise (Florida Atlantic coast default; he can
-- correct it — "set my city to ___"). Only used to enrich the morning brief.
insert into kalebos_config (key, value) values
('location', '{"lat":26.12,"lon":-80.14,"city":"Fort Lauderdale, FL"}')
on conflict (key) do nothing;
