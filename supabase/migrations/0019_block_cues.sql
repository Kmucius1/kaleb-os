-- Natural, spoken-style notification cues per block ("It's time to wake up").
-- Notify on EVERY block.
alter table schedule_blocks add column if not exists cue text;
update schedule_blocks set notify = true;

update schedule_blocks set cue = case day_type || ':' || sort_order
  -- Weekday
  when 'weekday:1'  then 'Time to wake up, Kaleb'
  when 'weekday:2'  then 'Time to trade — A+ setups only'
  when 'weekday:3'  then 'Journal your trades'
  when 'weekday:4'  then 'Time to meditate'
  when 'weekday:5'  then 'Time to hit the gym'
  when 'weekday:6'  then 'Beach walk — go catch the sunrise'
  when 'weekday:7'  then 'Time for breakfast'
  when 'weekday:8'  then 'Recovery sleep — protect it'
  when 'weekday:9'  then 'Time to prepare — shower & review your Top 3'
  when 'weekday:10' then 'Hey — time to head to work'
  when 'weekday:11' then 'Mission Mode — DRYP time'
  when 'weekday:12' then 'Time to head home — reflect on the day'
  when 'weekday:13' then 'Deep study time'
  when 'weekday:14' then 'Freedom Block — build your assets'
  when 'weekday:15' then 'Content Studio — time to create'
  when 'weekday:16' then 'Time for dinner — slow down'
  when 'weekday:17' then 'Evening meditation — release the day'
  when 'weekday:18' then 'Evening journal'
  when 'weekday:19' then 'Time to sleep. Repeat tomorrow.'
  -- Saturday
  when 'saturday:1' then 'Time to wake up, Kaleb'
  when 'saturday:2' then 'Time to trade — A+ setups only'
  when 'saturday:3' then 'Journal, then meditate'
  when 'saturday:4' then 'Time to hit the gym'
  when 'saturday:5' then 'Beach walk — go catch the sunrise'
  when 'saturday:6' then 'Time to create & explore'
  when 'saturday:7' then 'Go enjoy life'
  -- Sunday
  when 'sunday:1' then 'Time to wake up, Kaleb'
  when 'sunday:2' then 'Time to trade — A+ setups only'
  when 'sunday:3' then 'Journal, then meditate'
  when 'sunday:4' then 'Time to hit the gym'
  when 'sunday:5' then 'Beach walk — go catch the sunrise'
  when 'sunday:6' then 'Time for your weekly review'
  when 'sunday:7' then 'Reset day — prep for the week'
  when 'sunday:8' then 'Rest & prepare — zero-friction Monday'
  else title
end;
