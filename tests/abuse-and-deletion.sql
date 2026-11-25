-- Assertions for migrations 20261125000200_rate_limits.sql and 20261125000300_startup_deletion.sql.
-- Run only against a disposable database after applying every migration.
begin;
create function pg_temp.assert(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %', label; end if; end;
$$;
insert into auth.users (id) values ('12000000-0000-4000-8000-000000000001'), ('12000000-0000-4000-8000-000000000002');
insert into public.buyer_profiles (id, display_name) values ('12000000-0000-4000-8000-000000000002', 'Buyer');
insert into public.startup_submissions (id, owner_id, name, website_url, description, category, provider, stripe_account_id)
  values ('22000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001', 'Deletable', 'https://deletable.example', 'Desc', 'SaaS', 'stripe', 'acct_deletable');
insert into public.startup_payment_sources (id, owner_id, startup_id, provider, external_id, name) values
  ('32000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', 'stripe', 'acct_deletable', 'Stripe'),
  ('32000000-0000-4000-8000-000000000002', '12000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', 'revenuecat', 'projdeletable', 'RevenueCat');

set local role service_role;
select public.publish_startup_listing('12000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001',
  '32000000-0000-4000-8000-000000000001', 1000000, 50000, 40000, null) as listing_id \gset
reset role;
select set_config('test.listing', :'listing_id', true);

-- F-07: the 21st contact in a day is refused, and refused attempts don't count.
set local role authenticated;
select set_config('request.jwt.claim.sub', '12000000-0000-4000-8000-000000000002', true);
do $$ begin
  for i in 1..20 loop
    perform public.contact_listing(current_setting('test.listing')::uuid, 'Hello ' || i, false);
  end loop;
end $$;
reset role;
select pg_temp.assert((select count(*) = 20 from public.rate_limit_events where bucket = 'contact'), 'twenty contacts recorded');
set local role authenticated;
select set_config('request.jwt.claim.sub', '12000000-0000-4000-8000-000000000002', true);
do $$ begin
  perform public.contact_listing(current_setting('test.listing')::uuid, 'One too many', false);
  raise exception 'FAIL: 21st contact allowed';
exception when sqlstate 'P0005' then null; end $$;
reset role;
select pg_temp.assert((select count(*) = 20 from public.rate_limit_events where bucket = 'contact'), 'refused attempt is not counted');
select pg_temp.assert((select count(*) = 20 from public.seller_lead_messages m join public.seller_leads l on l.id = m.lead_id
  where l.buyer_id = '12000000-0000-4000-8000-000000000002'), 'refused message was not stored');

-- Limits are per user and can't be called by anonymous visitors or with unknown buckets.
set local role authenticated;
select set_config('request.jwt.claim.sub', '12000000-0000-4000-8000-000000000001', true);
select public.consume_rate_limit('contact');
do $$ begin perform public.consume_rate_limit('anything'); raise exception 'FAIL: unknown bucket accepted';
exception when sqlstate '22023' then null; end $$;
reset role;
set local role anon;
do $$ begin perform public.consume_rate_limit('contact'); raise exception 'FAIL: anon can consume';
exception when insufficient_privilege then null; end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '12000000-0000-4000-8000-000000000001', true);
do $$ begin perform 1 from public.rate_limit_events; raise exception 'FAIL: members can read rate-limit records';
exception when insufficient_privilege then null; end $$;
reset role;

-- F-10: a live listing blocks deletion; other members can't delete or disconnect.
set local role authenticated;
select set_config('request.jwt.claim.sub', '12000000-0000-4000-8000-000000000001', true);
do $$ begin perform public.delete_startup_draft('22000000-0000-4000-8000-000000000001'); raise exception 'FAIL: deleted a live listing';
exception when sqlstate 'P0006' then null; end $$;
select set_config('request.jwt.claim.sub', '12000000-0000-4000-8000-000000000002', true);
do $$ begin perform public.delete_startup_draft('22000000-0000-4000-8000-000000000001'); raise exception 'FAIL: outsider deleted a draft';
exception when insufficient_privilege then null; end $$;
do $$ begin perform public.disconnect_payment_source('32000000-0000-4000-8000-000000000002'); raise exception 'FAIL: outsider disconnected';
exception when insufficient_privilege then null; end $$;
reset role;

-- Disconnecting clears the matching legacy account ID; the only identity left can't be removed without a website.
set local role authenticated;
select set_config('request.jwt.claim.sub', '12000000-0000-4000-8000-000000000001', true);
select public.disconnect_payment_source('32000000-0000-4000-8000-000000000001');
reset role;
select pg_temp.assert((select stripe_account_id is null from public.startup_submissions where id = '22000000-0000-4000-8000-000000000001'), 'disconnect clears the Stripe account ID');
select pg_temp.assert((select count(*) = 1 from public.startup_payment_sources where startup_id = '22000000-0000-4000-8000-000000000001'), 'only the chosen provider is removed');
update public.startup_submissions set website_url = null, revenuecat_project_id = 'projdeletable', provider = 'revenuecat'
  where id = '22000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub', '12000000-0000-4000-8000-000000000001', true);
do $$ begin perform public.disconnect_payment_source('32000000-0000-4000-8000-000000000002'); raise exception 'FAIL: left a draft with no identity';
exception when sqlstate 'P0007' then null; end $$;
reset role;
update public.startup_submissions set website_url = 'https://deletable.example' where id = '22000000-0000-4000-8000-000000000001';

-- After withdrawing, the owner can delete: draft and sources go, the startup leaves the leaderboard,
-- and existing buyer threads keep working.
set local role authenticated;
select set_config('request.jwt.claim.sub', '12000000-0000-4000-8000-000000000001', true);
select public.withdraw_startup_listing(:'listing_id');
select public.delete_startup_draft('22000000-0000-4000-8000-000000000001');
reset role;
select pg_temp.assert((select count(*) = 0 from public.startup_submissions where id = '22000000-0000-4000-8000-000000000001'), 'draft deleted');
select pg_temp.assert((select count(*) = 0 from public.startup_payment_sources where startup_id = '22000000-0000-4000-8000-000000000001'), 'sources deleted with the draft');
select pg_temp.assert((select count(*) = 0 from public.leaderboard where name = 'Deletable'), 'deleted startup leaves the leaderboard');
select pg_temp.assert((select count(*) = 1 from public.seller_leads where listing_id = :'listing_id'), 'buyer thread history is kept');

-- F-28: the seller sees the buyer profile for their own leads; nobody else does.
update public.buyer_profiles set bio = 'Operator looking for SaaS', budget_min = 10000, budget_max = 50000 where id = '12000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub', '12000000-0000-4000-8000-000000000001', true);
select pg_temp.assert((select count(*) = 1 and bool_and(bio = 'Operator looking for SaaS' and budget_max = 50000) from public.seller_lead_buyers), 'seller sees the buyer profile of their lead');
select set_config('request.jwt.claim.sub', '12000000-0000-4000-8000-000000000002', true);
select pg_temp.assert((select count(*) = 0 from public.seller_lead_buyers), 'buyers do not see the seller-side view');
reset role;
set local role anon;
do $$ begin perform 1 from public.seller_lead_buyers; raise exception 'FAIL: anon can read buyer context';
exception when insufficient_privilege then null; end $$;
reset role;

-- Storage: founders may delete only files in their own folder.
insert into storage.buckets (id) values ('startup-draft-logos') on conflict do nothing;
insert into storage.objects (bucket_id, name) values
  ('startup-draft-logos', '12000000-0000-4000-8000-000000000001/x.png'),
  ('startup-draft-logos', '12000000-0000-4000-8000-000000000002/y.png');
set local role authenticated;
select set_config('request.jwt.claim.sub', '12000000-0000-4000-8000-000000000001', true);
delete from storage.objects where bucket_id = 'startup-draft-logos';
reset role;
select pg_temp.assert((select array_agg(name) = array['12000000-0000-4000-8000-000000000002/y.png'] from storage.objects where bucket_id = 'startup-draft-logos'), 'founders delete only their own logo files');

select 'Rate-limit and deletion assertions passed.';
rollback;
