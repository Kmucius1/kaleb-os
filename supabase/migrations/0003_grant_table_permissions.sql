-- Grant object-level permissions so service_role (n8n workflows) can read/write
-- Tables created via migration don't auto-grant like the Supabase dashboard does
grant select, insert, update, delete on all tables in schema public to service_role, authenticated, anon;
grant usage on schema public to service_role, authenticated, anon;
