-- Phase 1: Foundation
-- Run this in Supabase SQL editor

-- Enable pgvector
create extension if not exists vector;

-- Raw captures table: everything lands here first
create table raw_captures (
  id uuid primary key default gen_random_uuid(),
  source text not null,           -- 'gmail' | 'plaud' | 'manual' | 'gcal' | 'tradeprint'
  source_id text,                 -- external ID (gmail message id, etc)
  content_type text,              -- 'text' | 'audio' | 'transcript' | 'email'
  content_text text,
  content_audio_url text,
  metadata jsonb default '{}'::jsonb,
  processed boolean default false,
  created_at timestamptz default now()
);

create index on raw_captures (source, created_at desc);
create index on raw_captures (processed) where processed = false;

-- RLS: only your authenticated user can read/write
alter table raw_captures enable row level security;

create policy "Owner only" on raw_captures
  for all using (auth.uid() = auth.uid());
