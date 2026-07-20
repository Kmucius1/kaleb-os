-- Re-grant object permissions for tables added after 0003 (schedule_blocks,
-- schedule_events, project_status). Tables created via the Management API don't
-- auto-grant to service_role like the Supabase dashboard does.
grant select, insert, update, delete on all tables in schema public to service_role, authenticated, anon;
grant usage, select on all sequences in schema public to service_role, authenticated, anon;

-- And make future tables auto-grant so this never bites again.
alter default privileges in schema public grant select, insert, update, delete on tables to service_role, authenticated, anon;
alter default privileges in schema public grant usage, select on sequences to service_role, authenticated, anon;
