-- Manual check-offs: Kaleb marking that he actually DID a scheduled block
-- (or event) on a given day. Blocks repeat daily, so a completion is keyed by
-- (ref_type, ref_id, done_date). Generic ref_type lets events/tasks reuse it.
create table if not exists public.completions (
  id uuid primary key default gen_random_uuid(),
  ref_type text not null default 'block',   -- 'block' | 'event'
  ref_id text not null,                       -- schedule_blocks.id / schedule_events.id
  done_date date not null,                    -- ET calendar date it was done
  created_at timestamptz not null default now(),
  unique (ref_type, ref_id, done_date)
);

create index if not exists completions_date_idx on public.completions (done_date);

alter table public.completions enable row level security;

-- App uses the service key (server-side); keep a permissive policy consistent
-- with the rest of the schema (access is gated at the app/login layer).
drop policy if exists completions_all on public.completions;
create policy completions_all on public.completions for all using (true) with check (true);

grant all on public.completions to anon, authenticated, service_role;
