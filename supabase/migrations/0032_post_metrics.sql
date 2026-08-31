-- ============================================================================
-- KalebOS — what the content actually did.
--
-- content_posts already stored views, likes, comments, shares, saves,
-- followers_gained and leads. Four columns complete the picture, plus a topic
-- so performance can be grouped by what the video was ABOUT rather than by
-- which one it was.
--
-- Entry is deliberately manual to start. Platform APIs for watch time are
-- gated and change often, and automating ingestion before knowing whether the
-- ranking is even useful would be building the expensive half first.
-- ============================================================================

alter table content_posts add column if not exists reach          bigint;
alter table content_posts add column if not exists watch_time_sec bigint;
-- Average percentage of the video watched. The single best predictor of reach
-- on every short-form platform, and the thing raw views hides.
alter table content_posts add column if not exists avg_watch_pct  numeric;
alter table content_posts add column if not exists profile_visits bigint;
alter table content_posts add column if not exists topic          text;
-- Which idea produced it, so a post can be traced back to the batch.
alter table content_posts add column if not exists idea_id        uuid references content_ideas(id) on delete set null;

create index if not exists idx_content_posts_topic on content_posts(topic, posted_at desc);
create index if not exists idx_content_posts_idea on content_posts(idea_id);

do $$ begin
  alter table content_posts add constraint content_posts_watch_pct_ck
    check (avg_watch_pct is null or (avg_watch_pct >= 0 and avg_watch_pct <= 100));
exception when duplicate_object then null; end $$;

-- Below this many scored posts the ranking is noise, and showing it would
-- teach him to chase a pattern that isn't there.
insert into kalebos_config (key, value) values
  ('topic_ranking_min_posts', '30')
on conflict (key) do update set value = excluded.value;
