begin;

grant update (category) on public.startup_submissions to authenticated;

-- Buyer identity/preferences are independent of the existing seller profile.
create table public.buyer_profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 100),
  bio text not null default '' check (char_length(bio) <= 180),
  budget_min bigint check (budget_min between 0 and 100000000000),
  budget_max bigint check (budget_max between 0 and 100000000000),
  categories text[] not null default '{}' check (cardinality(categories) <= 20),
  notify_messages boolean not null default true,
  notify_price_drops boolean not null default true,
  check (budget_min is null or budget_max is null or budget_min <= budget_max)
);
create table public.saved_listings (
  buyer_id uuid not null default auth.uid() references auth.users on delete cascade,
  listing_id uuid not null references public.sale_listings on delete cascade,
  created_at timestamptz not null default now(),
  primary key (buyer_id, listing_id)
);
create table public.buyer_feedback (
  owner_id uuid not null references auth.users on delete cascade,
  slot smallint not null check (slot between 1 and 10),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  primary key (owner_id, slot)
);
alter table public.buyer_profiles enable row level security;
alter table public.saved_listings enable row level security;
alter table public.buyer_feedback enable row level security;
revoke all on public.buyer_profiles, public.saved_listings, public.buyer_feedback from public, anon, authenticated;
grant all on public.buyer_profiles, public.saved_listings, public.buyer_feedback to service_role;
grant select, insert, update on public.buyer_profiles to authenticated;
grant select on public.saved_listings, public.buyer_feedback to authenticated;
create policy "Buyers manage their own profile" on public.buyer_profiles to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "Buyers read their saves" on public.saved_listings for select to authenticated using (buyer_id = (select auth.uid()));
create policy "Buyers read their feedback" on public.buyer_feedback for select to authenticated using (owner_id = (select auth.uid()));

alter table public.seller_leads
  add column inquiry_at timestamptz,
  add column offer_cents bigint check (offer_cents between 1 and 10000000000000),
  add column inquiry_status text not null default 'none' check (inquiry_status in ('none','open','accepted','declined','withdrawn','completed'));
create index seller_leads_buyer_idx on public.seller_leads (buyer_id, created_at desc);
grant select (listing_id, seller_id, buyer_id, inquiry_at, offer_cents, inquiry_status) on public.seller_leads to authenticated;
create policy "Buyers read their conversations" on public.seller_leads for select to authenticated using (buyer_id = (select auth.uid()));
-- The existing message policy checks lead visibility, so it now admits both participants.
create view public.buyer_conversations with (security_barrier = true) as
select id, listing_id, buyer_name, startup_name, created_at, last_message_at, last_sender,
  inquiry_at, offer_cents, inquiry_status from public.seller_leads where buyer_id = (select auth.uid());
revoke all on public.buyer_conversations from public, anon;
grant select on public.buyer_conversations to authenticated;

-- Only these functions may create leads or change buyer activity. Client-supplied
-- seller IDs, sender identities and company names are never trusted.
create function public.ensure_buyer_lead(p_listing_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare member uuid := auth.uid(); seller uuid; company text; buyer text; target uuid;
begin
  if member is null then raise exception 'Sign-in required' using errcode = '42501'; end if;
  select s.owner_id, case when s.anonymous then 'Unnamed Company' else s.name end into seller, company
    from public.sale_listings l join public.startups s on s.id = l.startup_id
    where l.id = p_listing_id and l.status = 'active' and l.listed_at <= now() and s.published_at <= now() for update of l;
  if seller is null or seller = member then raise exception 'Listing unavailable' using errcode = 'P0002'; end if;
  select display_name into buyer from public.buyer_profiles where id = member;
  if buyer is null then raise exception 'Complete your buyer profile first' using errcode = 'P0003'; end if;
  insert into public.seller_leads (listing_id, seller_id, buyer_id, buyer_name, startup_name)
    values (p_listing_id, seller, member, buyer, company)
    on conflict (listing_id, buyer_id) do update set buyer_name = excluded.buyer_name
    returning id into target;
  return target;
end;
$$;
revoke all on function public.ensure_buyer_lead(uuid) from public, anon, authenticated;

create function public.set_saved_listing(p_listing_id uuid, p_saved boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign-in required' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text || ':' || p_listing_id::text, 0));
  if p_saved then
    perform public.ensure_buyer_lead(p_listing_id);
    insert into public.saved_listings (buyer_id, listing_id) values (auth.uid(), p_listing_id) on conflict do nothing;
  else
    delete from public.saved_listings where buyer_id = auth.uid() and listing_id = p_listing_id;
    delete from public.seller_leads where buyer_id = auth.uid() and listing_id = p_listing_id
      and last_message_at is null and inquiry_status = 'none';
  end if;
end;
$$;
revoke all on function public.set_saved_listing(uuid, boolean) from public, anon;
grant execute on function public.set_saved_listing(uuid, boolean) to authenticated;

create function public.contact_listing(p_listing_id uuid, p_body text, p_inquiry boolean, p_offer_cents bigint default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare target uuid;
begin
  if char_length(btrim(p_body)) not between 1 and 2000 or p_body is null then raise exception 'Invalid message'; end if;
  if p_offer_cents is not null and (not p_inquiry or p_offer_cents not between 1 and 10000000000000) then raise exception 'Invalid offer'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text || ':' || p_listing_id::text, 0));
  target := public.ensure_buyer_lead(p_listing_id);
  if p_inquiry then
    if exists (select 1 from public.seller_leads where id = target and inquiry_status in ('open','accepted','completed')) then
      raise exception 'An inquiry already exists' using errcode = 'P0004';
    end if;
    update public.seller_leads set inquiry_at = now(), offer_cents = p_offer_cents, inquiry_status = 'open', archived = false where id = target;
  end if;
  update public.seller_leads set archived = false where id = target;
  insert into public.seller_lead_messages (lead_id, sender, body) values (target, 'buyer', btrim(p_body));
  return target;
end;
$$;
revoke all on function public.contact_listing(uuid, text, boolean, bigint) from public, anon;
grant execute on function public.contact_listing(uuid, text, boolean, bigint) to authenticated;

create function public.send_buyer_message(p_lead_id uuid, p_body text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (select 1 from public.seller_leads where id = p_lead_id and buyer_id = auth.uid()) then
    raise exception 'Conversation unavailable' using errcode = '42501';
  end if;
  insert into public.seller_lead_messages (lead_id, sender, body) values (p_lead_id, 'buyer', btrim(p_body));
  update public.seller_leads set archived = false where id = p_lead_id;
end;
$$;
revoke all on function public.send_buyer_message(uuid, text) from public, anon;
grant execute on function public.send_buyer_message(uuid, text) to authenticated;

create function public.update_acquisition(p_lead_id uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare lead public.seller_leads; active_listing uuid;
begin
  -- Lock the listing first in every transition, including competing inquiries.
  select listing_id into active_listing from public.seller_leads where id = p_lead_id
    and (seller_id = auth.uid() or buyer_id = auth.uid());
  if active_listing is null then raise exception 'Conversation unavailable' using errcode = '42501'; end if;
  perform 1 from public.sale_listings where id = active_listing for update;
  select * into lead from public.seller_leads where id = p_lead_id for update;
  if lead.buyer_id = auth.uid() and p_status = 'withdrawn' and lead.inquiry_status in ('open','accepted') then
    null;
  elsif lead.seller_id = auth.uid() and ((lead.inquiry_status = 'open' and p_status in ('accepted','declined'))
    or (lead.inquiry_status = 'accepted' and p_status in ('completed','declined'))) then
    if not exists (select 1 from public.sale_listings where id = lead.listing_id and status = 'active') then
      raise exception 'Listing unavailable' using errcode = 'P0002';
    end if;
  else raise exception 'Invalid inquiry transition' using errcode = '42501'; end if;
  update public.seller_leads set inquiry_status = p_status where id = lead.id;
  if p_status = 'completed' then
    update public.sale_listings set status = 'sold' where id = lead.listing_id;
    update public.seller_leads set inquiry_status = 'declined' where listing_id = lead.listing_id and id <> lead.id and inquiry_status in ('open','accepted');
  end if;
  insert into public.seller_lead_messages (lead_id, sender, body) values
    (lead.id, case when lead.seller_id = auth.uid() then 'seller' else 'buyer' end, 'Acquisition status: ' || p_status || '.');
end;
$$;
revoke all on function public.update_acquisition(uuid, text) from public, anon;
grant execute on function public.update_acquisition(uuid, text) to authenticated;

create function public.submit_buyer_feedback(p_body text) returns void
language plpgsql security definer set search_path = '' as $$
declare member uuid := auth.uid(); next_slot smallint;
begin
  if member is null then raise exception 'Sign-in required' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('buyer-feedback:' || member::text, 0));
  select coalesce(max(slot), 0) + 1 into next_slot from public.buyer_feedback where owner_id = member;
  if next_slot > 10 then raise exception 'Feedback limit reached' using errcode = 'P0001'; end if;
  insert into public.buyer_feedback (owner_id, slot, body) values (member, next_slot, btrim(p_body));
end;
$$;
revoke all on function public.submit_buyer_feedback(text) from public, anon;
grant execute on function public.submit_buyer_feedback(text) to authenticated;

-- Keep the private startup route intact. Public listing details use only the
-- marketplace projection; anonymous identities and private provider data stay private.
alter table public.startups add column submission_id uuid unique references public.startup_submissions on delete set null,
  add column product_details jsonb not null default '{}';
create view public.marketplace_details with (security_barrier = true) as
select m.*, case when not s.anonymous then s.website_url end as website_url,
  case when not s.anonymous then s.product_details else '{}'::jsonb end as product_details,
  r.provider as revenue_provider, r.verified_at, r.measured_on,
  s.owner_id = (select auth.uid()) as is_owner
from public.marketplace m join public.sale_listings l on l.id = m.id
join public.startups s on s.id = l.startup_id
join lateral (select provider, verified_at, measured_on from public.revenue_snapshots where startup_id = s.id order by measured_on desc limit 1) r on true;
create view public.seller_publications with (security_barrier = true) as
select s.submission_id, l.id as listing_id, l.asking_price_cents, l.status
from public.startups s join public.sale_listings l on l.startup_id = s.id
where s.owner_id = (select auth.uid());
revoke all on public.marketplace_details, public.seller_publications from public, anon;
grant select on public.marketplace_details to anon, authenticated;
grant select on public.seller_publications to authenticated;

-- Only the server may publish verified financials, after fetching the selected
-- provider again and matching its external account ID. Stored draft metrics,
-- which a draft owner can edit, are deliberately not used as verification proof.
create function public.publish_startup_listing(p_owner uuid, p_submission uuid, p_source uuid,
  p_price bigint, p_revenue bigint, p_mrr bigint, p_logo text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare draft public.startup_submissions; source public.startup_payment_sources; company uuid; listing uuid;
begin
  select * into draft from public.startup_submissions where id = p_submission and owner_id = p_owner for update;
  select * into source from public.startup_payment_sources where id = p_source and startup_id = p_submission and owner_id = p_owner;
  if draft.id is null or source.id is null then raise exception 'Startup unavailable' using errcode = '42501'; end if;
  if draft.website_url is null or btrim(draft.description) = '' then raise exception 'Complete the website and description before publishing' using errcode = 'P0003'; end if;
  if p_price is null or p_price not between 1 and 10000000000000 or p_revenue is null or p_revenue < 0 or p_mrr < 0 then raise exception 'Invalid financials'; end if;
  insert into public.profiles (id) values (p_owner) on conflict do nothing;
  insert into public.startups (owner_id, submission_id, slug, name, description, website_url, logo_url, category,
    founded_on, country, mobile_app, anonymous, published_at, product_details)
  values (p_owner, draft.id, 'startup-' || draft.id::text, draft.name, draft.description, draft.website_url, p_logo, draft.category,
    draft.founded_on, draft.country, draft.mobile_app, draft.anonymous, now(),
    pg_catalog.jsonb_build_object('Value proposition', draft.value_proposition, 'Problem solved', draft.problem_solved,
      'Audience', draft.audience_description, 'Pricing', draft.pricing, 'Additional info', draft.additional_info,
      'Tech stack', array_to_string(draft.tech_stack, ', '), 'Team size', draft.team_size))
  on conflict (submission_id) do update set name = excluded.name, description = excluded.description,
    website_url = excluded.website_url, logo_url = excluded.logo_url, category = excluded.category,
    founded_on = excluded.founded_on, country = excluded.country, mobile_app = excluded.mobile_app,
    anonymous = excluded.anonymous, product_details = excluded.product_details
  returning id into company;
  if exists (select 1 from public.sale_listings where startup_id = company and status = 'sold') then
    raise exception 'This startup has already been sold' using errcode = 'P0004';
  end if;
  insert into public.revenue_snapshots (startup_id, measured_on, provider, verified_at, revenue_30d_cents, mrr_cents, includes_nonrecurring)
  values (company, current_date, source.provider, now(), p_revenue, p_mrr, true)
  on conflict (startup_id, measured_on) do update set provider = excluded.provider, verified_at = excluded.verified_at,
    revenue_30d_cents = excluded.revenue_30d_cents, mrr_cents = excluded.mrr_cents,
    revenue_growth_pct = null, mrr_growth_pct = null, includes_nonrecurring = true;
  select id into listing from public.sale_listings where startup_id = company order by listed_at desc nulls last, id limit 1 for update;
  if listing is null then
    insert into public.sale_listings (startup_id, status, asking_price_cents, profit_margin_pct, listed_at, public_preview)
      values (company, 'active', p_price, draft.profit_margin_pct, now(), true) returning id into listing;
  else
    update public.sale_listings set status = 'active',
      previous_price_cents = case when asking_price_cents <> p_price then asking_price_cents else previous_price_cents end,
      asking_price_cents = p_price, profit_margin_pct = draft.profit_margin_pct, listed_at = coalesce(listed_at, now()) where id = listing;
  end if;
  update public.startup_submissions set wants_sale = true where id = draft.id;
  return listing;
end;
$$;
revoke all on function public.publish_startup_listing(uuid, uuid, uuid, bigint, bigint, bigint, text) from public, anon, authenticated;
grant execute on function public.publish_startup_listing(uuid, uuid, uuid, bigint, bigint, bigint, text) to service_role;

create function public.withdraw_startup_listing(p_listing uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign-in required' using errcode = '42501'; end if;
  update public.sale_listings l set status = 'withdrawn' from public.startups s
    where l.id = p_listing and l.startup_id = s.id and s.owner_id = auth.uid() and l.status = 'active';
  if not found then raise exception 'Listing unavailable' using errcode = '42501'; end if;
  update public.seller_leads set inquiry_status = 'declined' where listing_id = p_listing and inquiry_status in ('open','accepted');
end;
$$;
revoke all on function public.withdraw_startup_listing(uuid) from public, anon;
grant execute on function public.withdraw_startup_listing(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('listing-logos', 'listing-logos', true, 819200, array['image/png']);
commit;
