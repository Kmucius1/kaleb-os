-- Phase 2: v2 full schema
-- Run in Supabase SQL editor

-- ============================================================
-- Extensions
-- ============================================================
create extension if not exists vector;

-- ============================================================
-- 1. Extend existing raw_captures
-- ============================================================
alter table raw_captures
  add column if not exists content_audio_url text,
  add column if not exists processed boolean default false;

create index if not exists idx_raw_captures_unprocessed
  on raw_captures (processed) where processed = false;

create index if not exists idx_raw_captures_source_created
  on raw_captures (source, created_at desc);

-- Drop the always-true policy ("auth.uid() = auth.uid()" — wide open)
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where tablename = 'raw_captures' and schemaname = 'public'
  loop
    execute format('drop policy if exists %I on raw_captures', pol.policyname);
  end loop;
end $$;

-- ============================================================
-- 2. Memory layer
-- ============================================================
create table if not exists memories (
  id                 uuid primary key default gen_random_uuid(),
  raw_capture_id     uuid references raw_captures(id),
  summary            text not null,
  full_content       text,
  memory_tier        text not null,      -- 'permanent' | 'temporary'
  expires_at         timestamptz,
  category           text,               -- 'business' | 'trading' | 'agency' | 'brand' | 'personal' | 'relationship'
  importance_score   int,
  embedding          vector(1536),
  tags               text[] default array[]::text[],
  last_referenced_at timestamptz,
  created_at         timestamptz default now()
);
create index if not exists idx_memories_category_created
  on memories (category, created_at desc);
create index if not exists idx_memories_expires
  on memories (expires_at) where expires_at is not null;
-- Note: ivfflat index requires ≥100 rows to train. Run after populating data:
-- create index on memories using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create table if not exists filter_decisions (
  id             uuid primary key default gen_random_uuid(),
  raw_capture_id uuid references raw_captures(id),
  stage          int,
  decision       text,     -- 'pass' | 'junk' | 'temporary' | 'permanent'
  reason         text,
  reviewed       boolean default false,
  override       text,
  created_at     timestamptz default now()
);

-- ============================================================
-- 3. Action layer
-- ============================================================
create table if not exists goals (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  category         text,
  target_metric    text,
  target_value     numeric,
  current_value    numeric,
  deadline         timestamptz,
  status           text default 'active',
  last_progress_at timestamptz,
  created_at       timestamptz default now()
);

create table if not exists tasks (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text,
  source_memory_id uuid references memories(id),
  category         text,
  priority_score   numeric,
  deadline         timestamptz,
  status           text default 'todo',
  energy_required  text,
  created_by       text,
  created_at       timestamptz default now()
);

create table if not exists ideas (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  content           text,
  source_capture_id uuid references raw_captures(id),
  category          text,
  developed         boolean default false,
  linked_project_id uuid,
  last_revisited_at timestamptz,
  created_at        timestamptz default now()
);

create table if not exists projects (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  category      text,
  status        text default 'active',
  owner         text,
  deliverables  jsonb,
  start_date    date,
  target_date   date,
  related_goals uuid[],
  created_at    timestamptz default now()
);

create table if not exists contacts (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  role                 text,
  company              text,
  relationship_tier    text,   -- 'inner_circle' | 'high_value' | 'professional' | 'cold'
  last_contact_at      timestamptz,
  contact_cadence_days int,
  notes_memory_ids     uuid[],
  email                text,
  phone                text,
  created_at           timestamptz default now()
);

-- ============================================================
-- 4. Trading
-- ============================================================
create table if not exists trading_raw (
  id             uuid primary key default gen_random_uuid(),
  trade_id       text,
  symbol         text,
  side           text,
  entry_at       timestamptz,
  exit_at        timestamptz,
  entry_price    numeric,
  exit_price     numeric,
  size           numeric,
  pnl            numeric,
  rules_followed jsonb,
  rules_broken   jsonb,
  notes          text,
  created_at     timestamptz default now()
);

create table if not exists trading_insights (
  id                uuid primary key default gen_random_uuid(),
  period_start      date,
  period_end        date,
  win_rate          numeric,
  avg_r             numeric,
  total_pnl         numeric,
  discipline_score  numeric,
  observed_patterns jsonb,
  hermes_assessment text,
  created_at        timestamptz default now()
);

-- ============================================================
-- 5. Agent layer
-- ============================================================
create table if not exists agent_actions (
  id              uuid primary key default gen_random_uuid(),
  action_type     text,
  risk_tier       text,     -- 'low' | 'medium' | 'high'
  target_table    text,
  target_id       uuid,
  payload         jsonb,
  status          text,     -- 'auto_executed' | 'awaiting_approval' | 'approved' | 'rejected' | 'sent' | 'undone'
  reasoning       text,
  outcome         jsonb,
  kaleb_feedback  text,
  created_at      timestamptz default now(),
  resolved_at     timestamptz
);

create table if not exists agent_recommendations (
  id              uuid primary key default gen_random_uuid(),
  recommendation  text not null,
  reasoning       text,
  priority_score  numeric,
  shown_at        timestamptz,
  accepted        boolean,
  outcome         text,
  created_at      timestamptz default now()
);

-- ============================================================
-- 6. Challenge layer
-- ============================================================
create table if not exists patterns (
  id                  uuid primary key default gen_random_uuid(),
  pattern_type        text,
  description         text,
  evidence_memory_ids uuid[],
  first_observed      timestamptz,
  last_observed       timestamptz,
  frequency           int,
  hermes_assessment   text,
  status              text default 'active',
  created_at          timestamptz default now()
);

create table if not exists contradictions (
  id                       uuid primary key default gen_random_uuid(),
  statement_a_memory_id    uuid references memories(id),
  statement_b_memory_id    uuid references memories(id),
  description              text,
  severity                 int,
  resolved                 boolean default false,
  resolution_notes         text,
  created_at               timestamptz default now()
);

create table if not exists execution_audits (
  id                   uuid primary key default gen_random_uuid(),
  audit_period_start   date,
  audit_period_end     date,
  commitments_reviewed jsonb,
  kept_count           int,
  broken_count         int,
  hermes_summary       text,
  created_at           timestamptz default now()
);

-- ============================================================
-- 7. RLS — enable on all new tables
-- (service_role key bypasses RLS automatically in Supabase)
-- ============================================================
alter table memories           enable row level security;
alter table filter_decisions   enable row level security;
alter table goals              enable row level security;
alter table tasks              enable row level security;
alter table ideas              enable row level security;
alter table projects           enable row level security;
alter table contacts           enable row level security;
alter table trading_raw        enable row level security;
alter table trading_insights   enable row level security;
alter table agent_actions      enable row level security;
alter table agent_recommendations enable row level security;
alter table patterns           enable row level security;
alter table contradictions     enable row level security;
alter table execution_audits   enable row level security;

-- ============================================================
-- 8. Ensure service_role has object-level grants (belt-and-suspenders)
-- ============================================================
grant select, insert, update, delete
  on all tables in schema public
  to service_role, authenticated;
grant usage on schema public to service_role, authenticated;
