-- Run only against a disposable local database after applying every migration.
-- psql -v ON_ERROR_STOP=1 -f tests/marketplace.sql
begin;
create function pg_temp.assert(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %', label; end if; end;
$$;
insert into auth.users (id) values
  ('10000000-0000-4000-8000-000000000001'), ('10000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-000000000003'), ('10000000-0000-4000-8000-000000000004');
insert into public.profiles (id, display_name, bio) values
  ('10000000-0000-4000-8000-000000000001', 'Seller identity', 'Seller bio');
insert into public.startup_submissions (id, owner_id, name, website_url, description, category, provider, anonymous, value_proposition)
  values ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
    'Secret startup', 'https://secret.example', 'Private description', 'SaaS', 'stripe', true, 'Secret product details');
insert into public.startup_payment_sources (id, owner_id, startup_id, provider, external_id, name)
  values ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001', 'stripe', 'acct_testmarketplace', 'Primary source');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
do $$ begin
  perform public.publish_startup_listing(auth.uid(), '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 10000000, 100000, 50000, null);
  raise exception 'FAIL: members can forge verified publication';
exception when insufficient_privilege then null; end $$;
reset role;
set local role service_role;
select public.publish_startup_listing('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 10000000, 100000, 50000, null) as listing_id \gset
reset role;
select set_config('test.listing', :'listing_id', true);
select pg_temp.assert((select count(*) = 1 from public.marketplace), 'published listing enters marketplace');

set local role service_role;
select pg_temp.assert(public.publish_startup_listing('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 9900000, 100000, 50000, null) = current_setting('test.listing')::uuid, 'republishing preserves listing ID');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select public.withdraw_startup_listing(current_setting('test.listing')::uuid);
select pg_temp.assert((select count(*) = 0 from public.marketplace), 'withdrawal removes listing from discovery');
reset role;
set local role service_role;
select pg_temp.assert(public.publish_startup_listing('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 10000000, 100000, 50000, null) = current_setting('test.listing')::uuid, 'withdrawn listing can be verified and republished');
reset role;

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select pg_temp.assert((select name = 'Unnamed Company' and website_url is null and product_details = '{}'::jsonb and description is null from public.marketplace_details where id = current_setting('test.listing')::uuid), 'anonymous identity and product details are redacted');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
do $$ begin
  perform public.set_saved_listing(current_setting('test.listing')::uuid, true);
  raise exception 'FAIL: buyer profile was not required';
exception when sqlstate 'P0003' then null; end $$;
insert into public.buyer_profiles (id, display_name, budget_min, budget_max, categories)
  values (auth.uid(), 'Buyer identity', 5000, 150000, array['SaaS']);
select public.set_saved_listing(current_setting('test.listing')::uuid, true);
select public.set_saved_listing(current_setting('test.listing')::uuid, true);
select pg_temp.assert((select count(*) = 1 from public.saved_listings), 'save is idempotent');
select pg_temp.assert((select count(*) = 1 from public.buyer_conversations), 'save creates one seller lead');
select pg_temp.assert((select startup_name = 'Unnamed Company' and buyer_name = 'Buyer identity' from public.buyer_conversations), 'lead identity comes from safe listing and buyer profile');
select public.set_saved_listing(current_setting('test.listing')::uuid, false);
select pg_temp.assert((select count(*) = 0 from public.buyer_conversations), 'unsave removes an untouched interest');
select public.contact_listing(current_setting('test.listing')::uuid, 'Could you share more about the business?', false) as thread_id \gset
select set_config('test.thread', :'thread_id', true);
select public.contact_listing(current_setting('test.listing')::uuid, 'I would like to acquire this business.', true, 9000000);
select pg_temp.assert((select inquiry_status = 'open' and offer_cents = 9000000 and last_sender = 'buyer' from public.buyer_conversations), 'message and inquiry reach the same thread atomically');
do $$ begin
  perform public.contact_listing(current_setting('test.listing')::uuid, 'Duplicate inquiry', true, null);
  raise exception 'FAIL: duplicate open inquiry was allowed';
exception when sqlstate 'P0004' then null; end $$;
do $$ begin
  perform public.update_acquisition(current_setting('test.thread')::uuid, 'accepted');
  raise exception 'FAIL: buyer accepted own inquiry';
exception when insufficient_privilege then null; end $$;
do $$ begin
  insert into public.seller_lead_messages (lead_id, sender, body) values (current_setting('test.thread')::uuid, 'seller', 'Forged message');
  raise exception 'FAIL: direct message spoofing was allowed';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform public.send_seller_message(current_setting('test.thread')::uuid, 'Forged seller identity');
  raise exception 'FAIL: buyer called seller send';
exception when insufficient_privilege then null; end $$;
update public.seller_leads set archived = true where id = current_setting('test.thread')::uuid;
select pg_temp.assert((select archived = false from public.seller_leads), 'buyer cannot archive seller inbox');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select pg_temp.assert((select count(*) = 0 from public.buyer_profiles), 'buyer profile isolation');
select pg_temp.assert((select count(*) = 0 from public.saved_listings), 'save isolation');
select pg_temp.assert((select count(*) = 0 from public.seller_leads), 'lead isolation');
select pg_temp.assert((select count(*) = 0 from public.seller_lead_messages), 'message isolation');
do $$ begin
  perform public.send_buyer_message(current_setting('test.thread')::uuid, 'Intrusion');
  raise exception 'FAIL: outsider sent a message';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform public.update_acquisition(current_setting('test.thread')::uuid, 'completed');
  raise exception 'FAIL: outsider completed inquiry';
exception when insufficient_privilege then null; end $$;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
insert into public.buyer_profiles (id, display_name, bio) values (auth.uid(), 'Separate buyer identity', 'Buyer bio');
select pg_temp.assert((select display_name = 'Seller identity' and bio = 'Seller bio' from public.profiles), 'seller and buyer profiles stay separate');
do $$ begin
  perform public.set_saved_listing(current_setting('test.listing')::uuid, true);
  raise exception 'FAIL: seller saved own startup';
exception when sqlstate 'P0002' then null; end $$;
select pg_temp.assert((select count(*) = 0 from public.buyer_conversations), 'seller does not see received leads as buyer activity');
select pg_temp.assert((select count(*) = 1 from public.seller_leads where seller_id = auth.uid()), 'seller sees buyer inquiry');
select public.send_seller_message(current_setting('test.thread')::uuid, 'Happy to share more details.');
select public.update_acquisition(current_setting('test.thread')::uuid, 'accepted');
update public.seller_leads set archived = true where id = current_setting('test.thread')::uuid;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select pg_temp.assert((select count(*) = 4 from public.seller_lead_messages), 'buyer sees seller replies');
select public.send_buyer_message(current_setting('test.thread')::uuid, 'Thanks, let’s review the terms.');
select pg_temp.assert((select archived = false from public.seller_leads), 'new buyer message restores archived seller thread');
select public.update_acquisition(current_setting('test.thread')::uuid, 'withdrawn');
select public.contact_listing(current_setting('test.listing')::uuid, 'Ready to reopen our discussion.', true, 9500000);
select public.set_saved_listing(current_setting('test.listing')::uuid, true);
select public.set_saved_listing(current_setting('test.listing')::uuid, false);
select pg_temp.assert((select count(*) = 1 from public.buyer_conversations), 'unsave preserves conversations and inquiries');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
insert into public.buyer_profiles (id, display_name) values (auth.uid(), 'Second buyer');
select public.contact_listing(current_setting('test.listing')::uuid, 'Competing inquiry', true, 9800000);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select public.update_acquisition(current_setting('test.thread')::uuid, 'accepted');
select public.update_acquisition(current_setting('test.thread')::uuid, 'completed');
select pg_temp.assert((select count(*) = 0 from public.marketplace), 'completed acquisition removes listing');
select pg_temp.assert((select inquiry_status = 'completed' from public.seller_leads where id = current_setting('test.thread')::uuid), 'completed inquiry retained');
select pg_temp.assert((select inquiry_status = 'declined' from public.seller_leads where id <> current_setting('test.thread')::uuid), 'competing inquiry closed');
do $$ begin
  perform public.contact_listing(current_setting('test.listing')::uuid, 'Sold startup', false);
  raise exception 'FAIL: sold startup accepted new inquiry';
exception when sqlstate 'P0002' then null; end $$;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
do $$ begin
  for i in 1..10 loop perform public.submit_buyer_feedback('Useful feedback ' || i); end loop;
  begin perform public.submit_buyer_feedback('Eleventh message'); raise exception 'FAIL: feedback quota exceeded';
    exception when sqlstate 'P0001' then
      if sqlerrm <> 'Feedback limit reached' then raise; end if;
  end;
end $$;
select pg_temp.assert((select count(*) = 10 from public.buyer_feedback), 'feedback quota enforced');
reset role;
set local role service_role;
do $$ begin
  perform public.publish_startup_listing('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 10000000, 100000, 50000, null);
  raise exception 'FAIL: sold startup was republished';
exception when sqlstate 'P0004' then null; end $$;
reset role;
rollback;
\echo 'Marketplace workflow and RLS assertions passed.'
