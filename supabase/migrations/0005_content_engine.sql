-- Phase A: Content Engine schema (MULTI-BRAND + COLLABORATION)
-- Kaleb's 3 owned brands (Personal / Ka1eb.ai / Trading) + client brands (EHM, later).
-- Personal page is the center of gravity; niche pages collab with it.
-- Run in Supabase SQL editor (KalebOS, ref eafrjiqjelumqgoefbfd).

-- ============================================================
-- 1. brands — the tenant. Holds voice/pillars/platforms/CTA per brand.
--    kind: 'personal' (center of gravity) | 'niche' (Kaleb's authority engine) | 'client'
-- ============================================================
create table if not exists brands (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,            -- 'me' | 'ai' | 'trading' | 'ehm' ...
  name         text not null,
  kind         text not null default 'niche',   -- 'personal' | 'niche' | 'client'
  company      text,                            -- client company (null for own brands)
  purpose      text,                            -- what this brand is FOR
  voice        text,
  pillars      jsonb default '[]'::jsonb,        -- [{name, description, weight}]
  platforms    jsonb default '{}'::jsonb,        -- per-platform rules
  niches       text[] default array[]::text[],   -- research focus for nightly job
  banned       text[] default array[]::text[],
  cta_rules    text,                            -- how CTAs should work for this brand
  default_collab_with text[] default array[]::text[],  -- slugs to collab with by default
  handles      jsonb default '{}'::jsonb,
  color        text,
  status       text default 'active',           -- 'active' | 'paused' | 'todo' | 'archived'
  updated_at   timestamptz default now(),
  created_at   timestamptz default now()
);

-- ============================================================
-- 2. content_research — nightly AI/trend/viral ingestion.
--    brand_id null = global feed any brand can draw from.
-- ============================================================
create table if not exists content_research (
  id          uuid primary key default gen_random_uuid(),
  brand_id    uuid references brands(id) on delete cascade,
  kind        text not null,                    -- 'ai_news'|'trend'|'viral_breakdown'
  title       text not null,
  summary     text,
  source_url  text,
  source_name text,
  relevance   text[] default array[]::text[],
  score       numeric,
  raw         jsonb,
  used        boolean default false,
  captured_at timestamptz default now(),
  created_at  timestamptz default now()
);
create index if not exists idx_research_brand on content_research (brand_id, captured_at desc);
create index if not exists idx_research_unused on content_research (used) where used = false;

-- ============================================================
-- 3. swipe_file — reverse-engineered viral hooks. brand_id null = shared.
-- ============================================================
create table if not exists swipe_file (
  id            uuid primary key default gen_random_uuid(),
  brand_id      uuid references brands(id) on delete set null,
  platform      text,
  hook_text     text not null,
  hook_type     text,
  structure     text,
  why_it_worked text,
  source_url    text,
  metrics       jsonb,
  tags          text[] default array[]::text[],
  created_at    timestamptz default now()
);
create index if not exists idx_swipe_brand on swipe_file (brand_id, platform, created_at desc);

-- ============================================================
-- 4. content_ideas — ranked, ready to script. Carries posting logic.
-- ============================================================
create table if not exists content_ideas (
  id                  uuid primary key default gen_random_uuid(),
  brand_id            uuid not null references brands(id) on delete cascade,
  title               text not null,
  angle               text,
  platform            text,
  pillar              text,
  goal                text,                     -- trust|teach|curiosity|conversation|leads|authority|connection
  collab              boolean default false,
  collab_with         text[] default array[]::text[],  -- brand slugs to collab with
  source_research_ids uuid[] default array[]::uuid[],
  hook_options        text[] default array[]::text[],
  score               numeric,
  status              text default 'idea',      -- 'idea'|'approved'|'scripted'|'posted'|'killed'
  notes               text,
  created_by          text default 'claude',
  created_at          timestamptz default now()
);
create index if not exists idx_ideas_brand_status on content_ideas (brand_id, status, score desc);

-- ============================================================
-- 5. content_scripts — the deliverable. Matches the 10-field output spec.
-- ============================================================
create table if not exists content_scripts (
  id              uuid primary key default gen_random_uuid(),
  brand_id        uuid not null references brands(id) on delete cascade,  -- (1) which brand
  idea_id         uuid references content_ideas(id) on delete set null,
  collab          boolean default false,                                  -- (2) collab?
  collab_with     text[] default array[]::text[],
  pillar          text,                                                   -- (3) content pillar
  goal            text,                                                   -- (4) goal of the post
  target_audience text,                                                   -- (5) target audience
  platform        text not null,
  format          text,                          -- 'short_video'|'post'|'thread'|'long_video'
  hook            text,                                                   -- (6) hook
  caption         text,                                                   -- (7) caption
  body            text,                          -- full script / VO for video
  cta             text,                                                   -- (8) CTA
  thumbnail_text  text,                                                   -- (9) thumbnail text
  comment_ideas   text[] default array[]::text[],                         -- (10) engagement comments
  beats           jsonb,                          -- on-screen text / VO / b-roll for video
  version         int default 1,
  status          text default 'draft',          -- 'draft'|'final'|'posted'
  created_at      timestamptz default now()
);
create index if not exists idx_scripts_brand on content_scripts (brand_id, idea_id);

-- ============================================================
-- 6. content_posts — performance + lead-conversion loop (per brand).
-- ============================================================
create table if not exists content_posts (
  id               uuid primary key default gen_random_uuid(),
  brand_id         uuid not null references brands(id) on delete cascade,
  script_id        uuid references content_scripts(id) on delete set null,
  platform         text not null,
  post_url         text,
  posted_at        timestamptz,
  views            bigint,
  likes            bigint,
  comments         bigint,
  shares           bigint,
  saves            bigint,
  followers_gained int,
  leads            int default 0,                -- the metric that matters
  metrics_raw      jsonb,
  updated_at       timestamptz default now(),
  created_at       timestamptz default now()
);
create index if not exists idx_posts_brand_posted on content_posts (brand_id, posted_at desc);

-- ============================================================
-- 7. RLS (service_role bypasses; app uses service key server-side)
-- ============================================================
alter table brands           enable row level security;
alter table content_research enable row level security;
alter table swipe_file       enable row level security;
alter table content_ideas    enable row level security;
alter table content_scripts  enable row level security;
alter table content_posts    enable row level security;

grant select, insert, update, delete
  on all tables in schema public to service_role, authenticated;
grant usage on schema public to service_role, authenticated;

-- ============================================================
-- 8. Seed: Kaleb's 3 brands + EHM (todo)
-- ============================================================
insert into brands (slug, name, kind, purpose, voice, pillars, niches, cta_rules, default_collab_with, color, status)
values
('me', 'Kaleb Mucius (Personal)', 'personal',
 'Center of gravity. Identity content — make people feel they are watching someone become. Builds trust, depth, relatability, long-term loyalty.',
 'Reflective, grounded, ambitious, human, spiritual, honest, sometimes funny, sometimes deep. Not too polished, not fake-motivational, not corporate. Feels like: "I am building something real, and becoming someone in the process."',
 '[{"name":"Becoming / Personal Evolution","weight":0.25,"description":"Growth, reinvention, discipline, identity, choosing who I am becoming."},
   {"name":"Freedom","weight":0.25,"description":"Time, location, mental, emotional, creative, family, creative freedom. The goal was never money, it was freedom."},
   {"name":"Spirituality / Presence / Inner Work","weight":0.2,"description":"Meditation, journaling, visualization, stillness, faith, surrender, alignment. Calm and grounded."},
   {"name":"Entrepreneurial Journey","weight":0.2,"description":"Behind-the-scenes of building DRYP/AI systems/client work. Documenting the build, not bragging."},
   {"name":"Lifestyle / Human Moments","weight":0.1,"description":"Family, Knicks, travel, beach, gym, friends, funny moments, daily life."}]'::jsonb,
 array['personal-growth','freedom','spirituality','entrepreneurship','lifestyle','mindset'],
 'Connection + conversation CTAs. Examples: "Have you ever felt this?", "What season are you in?", "Save this if you needed the reminder.", "Send this to someone building quietly."',
 array[]::text[], '#22c55e', 'active'),

('ai', 'Ka1eb.ai / Kaleb AI', 'niche',
 'AI education + lead-generation brand. Make people think "I didn''t know AI could do that" or "I need this in my business." Generate DMs, consultations, demos, clients for DRYP Digital.',
 'Simple, smart, practical, curious, optimistic, forward-thinking. Explain AI to a smart business owner who does not care about jargon. NOT a tech bro / generic AI news page / software manual / corporate consultant / hype account. Feels like: "Here is how AI actually helps your business."',
 '[{"name":"AI For Business Growth","weight":0.25,"description":"AI that follows up with leads, reactivates customers, books appointments, qualifies prospects, closes deals, speed-to-lead. AI as a revenue system."},
   {"name":"AI Automation","weight":0.2,"description":"Inbox, CRM updates, lead routing, proposals, support, reminders, reporting, follow-ups. Businesses need better systems before more employees."},
   {"name":"AI Operations / Behind-the-Scenes Systems","weight":0.15,"description":"Practical systems without full implementation: dashboards, smart CRM, AI agents working together. Show value, leave the build a mystery."},
   {"name":"AI Tools Explained Simply","weight":0.15,"description":"ChatGPT/Claude/Gemini/Perplexity/voice/video AI/agents — focus on OUTCOMES not features."},
   {"name":"Future of Work","weight":0.15,"description":"Small teams do what big teams did; owners using AI beat those who ignore it; delegate to machines."},
   {"name":"AI + Freedom","weight":0.1,"description":"Less admin, faster execution, fewer missed leads, more time to think/family/travel/build. AI = leverage, not replacement."}]'::jsonb,
 array['ai-for-business','ai-automation','ai-agents','ai-tools','future-of-work','lead-generation','claude','no-code'],
 'CTAs lead to DMs/audits/demos/consultations. LEAD-GEN RULE: teach what is possible, why it matters, the benefit, what to think about — but leave mystery around the build so they want help. Examples: "DM AI to see what this looks like in your business.", "Comment audit and I''ll send the AI business checklist.", "If your business still follows up manually, this is your sign."',
 array['me'], '#8b5cf6', 'active'),

('trading', 'Trading Page', 'niche',
 'Trading education, mindset, discipline, risk management, chart breakdowns, financial growth. Attract serious learners, not gamblers. Build demand for education, community, courses, live sessions, mentorship.',
 'Disciplined, clear, confident, direct, educational, honest. AVOID fake guru energy, flashy lifestyle flexing, overpromising profits, gambling language, "easy money." Feels like: "If you want to actually learn this skill, lock in."',
 '[{"name":"Trading Education","weight":0.25,"description":"Market structure, break & retest, ORB, HTF bias, entries, supply & demand, trend vs consolidation, R:R, stops, journaling. Beginner-accessible, serious."},
   {"name":"Trading Psychology","weight":0.25,"description":"Patience, discipline, revenge trading, overtrading, fear/greed, waiting for confirmation, sitting on hands. Most lose from self-control, not chart-reading."},
   {"name":"Risk Management","weight":0.2,"description":"Survival before profits: max trades/day, sizing, stops, risk per trade, protecting capital, passing on bad setups."},
   {"name":"Trader Lifestyle / Journey","weight":0.15,"description":"Studying, backtesting, journaling, losses & lessons, building confidence/consistency. Real and disciplined, not fake luxury."},
   {"name":"Financial Education / Freedom","weight":0.15,"description":"Building a skill, learning money, optionality, long-term thinking, escaping one-income dependency."}]'::jsonb,
 array['trading-education','trading-psychology','risk-management','market-structure','financial-freedom'],
 'CTAs lead to education/community/calls/course interest/conversation. Examples: "Comment chart for more breakdowns.", "DM R2R to learn the system.", "Save this before your next trading session."',
 array['me'], '#f59e0b', 'active'),

('ehm', 'EHM Strategies', 'client', 'Mortgage client. Social media managed for them.',
 null, '[]'::jsonb, array['mortgage','homebuying','real-estate','interest-rates','first-time-buyers'],
 null, array[]::text[], '#3b82f6', 'todo')
on conflict (slug) do nothing;
