-- Commerce / Autonomous Dropshipping Engine — Phase 1 ("The Brain + The Scout")
-- A Product Scout discovers + scores candidate products through a research-grounded
-- success-rate model, and queues WINNERS for Kaleb's one-tap approval. Nothing spends
-- money or launches without approval. Stores/campaigns tables are Phase-2 stubs.

-- ── Candidate products ────────────────────────────────────────────────────────
create table if not exists commerce_products (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  description          text,
  category             text,
  source               text default 'scout',      -- 'scout' | 'manual'
  source_url           text,                       -- where the scout found it / a ref link
  image_url            text,
  -- economics
  supplier_cost        numeric,                    -- est. sourcing cost (USD)
  suggested_price      numeric,                    -- est. impulse retail (USD)
  est_margin           numeric,                    -- est. net margin fraction (0-1)
  -- scoring (research-grounded 12-factor model; see lib/commerce-rubric.ts)
  scores               jsonb default '{}'::jsonb,  -- { factorId: {score:1-10, note:"..."} }
  score_total          numeric,                    -- 0-100 weighted
  success_probability  numeric,                    -- 0-100 predicted success rate
  verdict              text,                       -- 'winner' | 'maybe' | 'pass'
  reasoning            text,                       -- LLM narrative
  disqualified         boolean default false,
  disqualify_reason    text,
  -- lifecycle
  status               text default 'scored',      -- scored|queued|approved|rejected|held|launched|archived
  created_at           timestamptz default now(),
  scored_at            timestamptz default now(),
  decided_at           timestamptz
);
create index if not exists idx_commerce_products_status  on commerce_products (status);
create index if not exists idx_commerce_products_verdict on commerce_products (verdict);
create index if not exists idx_commerce_products_created on commerce_products (created_at desc);

-- ── Scout run audit log ───────────────────────────────────────────────────────
create table if not exists commerce_scout_runs (
  id                 uuid primary key default gen_random_uuid(),
  ran_at             timestamptz default now(),
  trigger            text default 'cron',          -- 'cron' | 'manual'
  candidates_found   int default 0,
  candidates_scored  int default 0,
  winners            int default 0,
  summary            text,
  model              text,
  status             text default 'ok',            -- 'ok' | 'error'
  error              text
);
create index if not exists idx_commerce_scout_runs_ran on commerce_scout_runs (ran_at desc);

-- ── Stores (Phase 2 stub — created now, filled on approval later) ─────────────
create table if not exists commerce_stores (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid references commerce_products(id) on delete set null,
  name        text,
  platform    text,                                -- shopify | lovable | custom
  url         text,
  status      text default 'planned',
  created_at  timestamptz default now()
);

-- ── Campaigns (Phase 2 stub) ──────────────────────────────────────────────────
create table if not exists commerce_campaigns (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid references commerce_stores(id) on delete set null,
  product_id  uuid references commerce_products(id) on delete set null,
  platform    text,                                -- meta | tiktok | google
  name        text,
  status      text default 'draft',
  spend       numeric default 0,
  revenue     numeric default 0,
  roas        numeric,
  metrics     jsonb default '{}'::jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── Editable config (rubric override, thresholds) ─────────────────────────────
create table if not exists commerce_config (
  key         text primary key,
  value       jsonb,
  updated_at  timestamptz default now()
);

-- RLS + grants (service-role client bypasses RLS; matches repo convention).
alter table commerce_products   enable row level security;
alter table commerce_scout_runs enable row level security;
alter table commerce_stores     enable row level security;
alter table commerce_campaigns  enable row level security;
alter table commerce_config     enable row level security;
grant select, insert, update, delete on commerce_products   to service_role, authenticated;
grant select, insert, update, delete on commerce_scout_runs to service_role, authenticated;
grant select, insert, update, delete on commerce_stores     to service_role, authenticated;
grant select, insert, update, delete on commerce_campaigns  to service_role, authenticated;
grant select, insert, update, delete on commerce_config     to service_role, authenticated;
