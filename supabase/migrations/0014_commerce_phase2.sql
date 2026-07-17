-- Commerce Phase 2 — "Approve → Live" build pipeline.
-- Approval fans out to: sourcing brief → Shopify draft listing → custom landing page.
-- build_status state machine: pending → building → ready → live | failed
-- ('ready' = page live + draft + sourcing brief, awaiting the ~2-min manual AutoDS
--  import in Phase 2a. 'live' = checkout_url set and Buy Now works.)

alter table commerce_products
  add column if not exists slug                text,
  add column if not exists build_status        text,          -- pending|building|ready|live|failed
  add column if not exists build_error         text,
  add column if not exists built_at            timestamptz,
  add column if not exists launched_at         timestamptz,
  -- sourcing (real supplier match vs the scout's estimates)
  add column if not exists supplier_source     text,          -- 'aliexpress' | 'cjdropshipping'
  add column if not exists supplier_url        text,
  add column if not exists supplier_cost_real  numeric,
  add column if not exists shipping_days       int,
  add column if not exists sourcing_notes      jsonb default '{}'::jsonb,
  -- listing (ONE Shopify store as checkout backend)
  add column if not exists shopify_product_id  text,
  add column if not exists shopify_variant_id  text,
  add column if not exists checkout_url        text,
  -- landing page
  add column if not exists landing_copy        jsonb,
  add column if not exists landing_page_url    text;

create unique index if not exists uq_commerce_products_slug on commerce_products (slug) where slug is not null;
create index if not exists idx_commerce_products_build on commerce_products (build_status);

-- Build audit log (mirrors commerce_scout_runs logging style)
create table if not exists commerce_build_events (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid references commerce_products(id) on delete cascade,
  step        text not null,                 -- sourcing|listing|page|finalize|manual
  status      text not null default 'ok',    -- start|ok|skip|manual_required|error
  detail      jsonb default '{}'::jsonb,
  created_at  timestamptz default now()
);
create index if not exists idx_commerce_build_events_product on commerce_build_events (product_id, created_at desc);

alter table commerce_build_events enable row level security;
grant select, insert, update, delete on commerce_build_events to service_role, authenticated;
