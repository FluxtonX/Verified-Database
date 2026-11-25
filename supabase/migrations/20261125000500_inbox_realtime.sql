-- F-30 (2026-11-25 audit): deliver new inbox messages over Supabase Realtime instead of polling.
-- Realtime checks the existing RLS policy on seller_lead_messages for every subscriber, so each
-- member only receives messages from conversations they take part in.
-- Guarded so the migration also runs on plain Postgres (CI), which has no Realtime publication.
do $$
begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime')
    and not exists (select 1 from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'seller_lead_messages') then
    alter publication supabase_realtime add table public.seller_lead_messages;
  end if;
end $$;
