-- Phase: link content-engine brands back to the DRYP CRM.
-- A client brand is created/updated by syncing from DRYP CRM services
-- (service_type social_media | ads_management). Personal brands are never touched.

alter table brands
  add column if not exists crm_account_id uuid,        -- DRYP CRM accounts.id
  add column if not exists services text[] default array[]::text[],  -- ['social_media','ads_management']
  add column if not exists managed boolean default true,             -- Kaleb's filter: active in content engine
  add column if not exists source text default 'manual';             -- 'manual' | 'crm_sync'

-- One brand per CRM account (lets us upsert cleanly on re-sync).
create unique index if not exists uniq_brands_crm_account
  on brands (crm_account_id) where crm_account_id is not null;
