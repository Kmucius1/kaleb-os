-- Trading journal: voice transcript + before/after screenshots, per trade.
create table if not exists trades (
  id          uuid primary key default gen_random_uuid(),
  trade_date  date default current_date,
  symbol      text,
  side        text,                         -- 'long' | 'short'
  transcript  text,                         -- spoken process (voice -> text)
  notes       text,
  pnl         numeric,
  outcome     text,                         -- 'win' | 'loss' | 'breakeven'
  screenshots text[] default array[]::text[], -- storage URLs (before/after)
  analysis    text,                         -- Claude's psychology/process analysis
  created_at  timestamptz default now()
);
create index if not exists idx_trades_date on trades (trade_date desc, created_at desc);
alter table trades enable row level security;
grant select, insert, update, delete on trades to service_role, authenticated;

-- Storage bucket for before/after trade screenshots.
insert into storage.buckets (id, name, public)
values ('trade-screenshots', 'trade-screenshots', true)
on conflict (id) do nothing;
