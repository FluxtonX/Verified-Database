-- Assertions for migration 20261125000000_trust_fixes.sql.
-- Run only against a disposable local database after applying every migration:
-- psql -v ON_ERROR_STOP=1 -f tests/trust-fixes.sql
begin;
create function pg_temp.assert(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %', label; end if; end;
$$;

-- F-02: no unpaid seed sponsors remain, so they free their slots.
select pg_temp.assert((select count(*) = 0 from public.sponsorships where state = 'seed'), 'seed sponsors removed');
select pg_temp.assert((public.sponsorship_catalog() ->> 'available')::int = 20, 'all 20 sponsor slots free without seeds');

insert into auth.users (id) values ('11000000-0000-4000-8000-000000000001'), ('11000000-0000-4000-8000-000000000002');
insert into public.startup_submissions (id, owner_id, name, website_url, description, category, provider)
  values ('21000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001',
    'Growth startup', 'https://growth.example', 'Public description', 'SaaS', 'stripe');
insert into public.startup_payment_sources (id, owner_id, startup_id, provider, external_id, name)
  values ('31000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001',
    '21000000-0000-4000-8000-000000000001', 'stripe', 'acct_trustfixes', 'Primary source');

-- F-03: the owner can switch anonymity on; another member can't touch it.
set local role authenticated;
select set_config('request.jwt.claim.sub', '11000000-0000-4000-8000-000000000002', true);
update public.startup_submissions set anonymous = true where id = '21000000-0000-4000-8000-000000000001';
reset role;
select pg_temp.assert((select not anonymous from public.startup_submissions where id = '21000000-0000-4000-8000-000000000001'), 'other members cannot change anonymity');
set local role authenticated;
select set_config('request.jwt.claim.sub', '11000000-0000-4000-8000-000000000001', true);
update public.startup_submissions set anonymous = true where id = '21000000-0000-4000-8000-000000000001';
update public.startup_submissions set anonymous = false where id = '21000000-0000-4000-8000-000000000001';
reset role;
select pg_temp.assert((select not anonymous from public.startup_submissions where id = '21000000-0000-4000-8000-000000000001'), 'owner can toggle anonymity');

-- F-04: the first verification has no comparison, so growth stays unknown.
set local role service_role;
select public.publish_startup_listing('11000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001',
  '31000000-0000-4000-8000-000000000001', 5000000, 80000, 40000, null) as listing_id \gset
reset role;
select pg_temp.assert((select revenue_growth_pct is null and mrr_growth_pct is null from public.revenue_snapshots), 'no growth without an earlier verification');
select pg_temp.assert((select measured_on = current_date from public.leaderboard where name = 'Growth startup'), 'leaderboard exposes when figures were verified');

-- Pretend that verification happened 30 days ago, then verify again with higher figures.
update public.revenue_snapshots set measured_on = current_date - 30;
set local role service_role;
select public.publish_startup_listing('11000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001',
  '31000000-0000-4000-8000-000000000001', 5000000, 100000, 50000, null);
reset role;
select pg_temp.assert((select revenue_growth_pct = 25 and mrr_growth_pct = 25 from public.revenue_snapshots where measured_on = current_date), 'month-over-month growth computed from the earlier verification');
select pg_temp.assert((select mrr_growth_pct = 25 from public.leaderboard where name = 'Growth startup'), 'leaderboard shows growth');

-- A verification only 10 days older is not month-over-month, so it is ignored.
update public.revenue_snapshots set measured_on = current_date - 10 where measured_on = current_date - 30;
set local role service_role;
select public.publish_startup_listing('11000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001',
  '31000000-0000-4000-8000-000000000001', 5000000, 100000, 50000, null);
reset role;
select pg_temp.assert((select revenue_growth_pct is null from public.revenue_snapshots where measured_on = current_date), 'growth needs a verification 25–35 days earlier');

-- F-22: a price update keeps the listing date; a relisting after withdrawal resets it.
update public.sale_listings set listed_at = now() - interval '40 days' where id = :'listing_id';
set local role service_role;
select public.publish_startup_listing('11000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001',
  '31000000-0000-4000-8000-000000000001', 4500000, 100000, 50000, null);
reset role;
select pg_temp.assert((select listed_at < now() - interval '39 days' and previous_price_cents = 5000000 from public.sale_listings where id = :'listing_id'), 'price update keeps the original listing date');
-- F-13: a buyer with an open inquiry is told why it closed when the seller withdraws.
insert into public.buyer_profiles (id, display_name) values ('11000000-0000-4000-8000-000000000002', 'Buyer two');
set local role authenticated;
select set_config('request.jwt.claim.sub', '11000000-0000-4000-8000-000000000002', true);
select public.contact_listing(:'listing_id', 'Interested in acquiring', true, 4000000) as lead_id \gset
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '11000000-0000-4000-8000-000000000001', true);
select public.withdraw_startup_listing(:'listing_id');
reset role;
select pg_temp.assert((select inquiry_status = 'declined' and last_sender = 'seller' from public.seller_leads where id = :'lead_id'), 'withdrawal closes the inquiry');
select pg_temp.assert((select count(*) = 1 from public.seller_lead_messages where lead_id = :'lead_id' and sender = 'seller' and body like 'The seller withdrew this listing%inquiry is closed.'), 'buyer is told the listing was withdrawn');
set local role service_role;
select public.publish_startup_listing('11000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001',
  '31000000-0000-4000-8000-000000000001', 4500000, 100000, 50000, null);
reset role;
select pg_temp.assert((select status = 'active' and listed_at > now() - interval '1 minute' from public.sale_listings where id = :'listing_id'), 'relisting counts as newly listed');

-- Anonymity chosen by the owner reaches the public views on the next publish.
update public.startup_submissions set anonymous = true where id = '21000000-0000-4000-8000-000000000001';
set local role service_role;
select public.publish_startup_listing('11000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001',
  '31000000-0000-4000-8000-000000000001', 4500000, 100000, 50000, null);
reset role;
set local role anon;
select pg_temp.assert((select name = 'Unnamed Company' and description is null and website_url is null from public.marketplace_details where id = :'listing_id'), 'anonymous listing redacts identity');
select pg_temp.assert((select count(*) = 0 from public.leaderboard where name = 'Growth startup'), 'anonymous startup name redacted on leaderboard');
reset role;

-- Members still cannot call the privileged publisher.
set local role authenticated;
do $$ begin
  perform public.publish_startup_listing(auth.uid(), '21000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', 1, 1, 1, null);
  raise exception 'FAIL: members can call publish after replace';
exception when insufficient_privilege then null; end $$;
reset role;

select 'Trust-fix assertions passed.';
rollback;
