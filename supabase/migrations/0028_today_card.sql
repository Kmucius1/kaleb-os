-- ============================================================================
-- KalebOS — the Today card's data.
--
-- The card asks for "Content 0/2" — two posts a day. The Content habit was
-- seeded binary, so it could only ever say done or not. Make it a count of two
-- so tapping it tracks the real target, and so /habits and the Today card show
-- the same number.
--
-- Real posts take over as the source once the content engine is logging them
-- (content_posts is empty today); the habit is the interim.
-- ============================================================================

update habits
   set kind = 'count', target = 2, step = 1, unit = ''
 where name = 'Content' and kind = 'binary';

-- The card reads meditation as two separate sittings. Both rows already exist
-- from 0022, but be explicit so a reseeded database still matches the card.
insert into habits (name, icon, kind, target, unit, step, pillar, sort_order)
select 'Meditate (PM)', 'meditate', 'binary', 1, '', 1, 'Mind', 2
where not exists (select 1 from habits where name = 'Meditate (PM)');
