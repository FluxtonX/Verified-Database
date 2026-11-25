-- F-07 (2026-11-25 audit): per-user rate limits, enforced in the database so they also apply
-- to direct API calls. Rejected actions roll back, so they don't use up the allowance.
--   message  60 per hour   (buyer and seller messages)
--   contact  20 per day    (new messages/inquiries from a listing page)
--   save     200 per day   (saving listings)
--   import   20 per hour   (provider imports and publish verifications; called by the server)
begin;

create table public.rate_limit_events (
  user_id uuid not null references auth.users on delete cascade,
  bucket text not null check (bucket in ('message', 'contact', 'save', 'import')),
  created_at timestamptz not null default now()
);
create index rate_limit_events_lookup on public.rate_limit_events (user_id, bucket, created_at desc);
alter table public.rate_limit_events enable row level security;
revoke all on public.rate_limit_events from public, anon, authenticated;
grant all on public.rate_limit_events to service_role;

create function public.consume_rate_limit(p_bucket text) returns void
language plpgsql security definer set search_path = '' as $$
declare member uuid := auth.uid(); max_events integer; span interval; used integer;
begin
  if member is null then raise exception 'Sign-in required' using errcode = '42501'; end if;
  case p_bucket
    when 'message' then max_events := 60; span := interval '1 hour';
    when 'contact' then max_events := 20; span := interval '1 day';
    when 'save' then max_events := 200; span := interval '1 day';
    when 'import' then max_events := 20; span := interval '1 hour';
    else raise exception 'Unknown rate limit' using errcode = '22023';
  end case;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('rate:' || member::text || ':' || p_bucket, 0));
  delete from public.rate_limit_events where user_id = member and bucket = p_bucket and created_at < now() - span;
  select count(*) into used from public.rate_limit_events where user_id = member and bucket = p_bucket;
  if used >= max_events then raise exception 'Too many requests' using errcode = 'P0005'; end if;
  insert into public.rate_limit_events (user_id, bucket) values (member, p_bucket);
end;
$$;
revoke all on function public.consume_rate_limit(text) from public, anon;
grant execute on function public.consume_rate_limit(text) to authenticated;

create or replace function public.contact_listing(p_listing_id uuid, p_body text, p_inquiry boolean, p_offer_cents bigint default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare target uuid;
begin
  perform public.consume_rate_limit('contact');
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

create or replace function public.send_buyer_message(p_lead_id uuid, p_body text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (select 1 from public.seller_leads where id = p_lead_id and buyer_id = auth.uid()) then
    raise exception 'Conversation unavailable' using errcode = '42501';
  end if;
  perform public.consume_rate_limit('message');
  insert into public.seller_lead_messages (lead_id, sender, body) values (p_lead_id, 'buyer', btrim(p_body));
  update public.seller_leads set archived = false where id = p_lead_id;
end;
$$;

create or replace function public.send_seller_message(p_lead_id uuid, p_body text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.seller_leads where id = p_lead_id and seller_id = auth.uid()
  ) then
    raise exception 'Conversation unavailable' using errcode = '42501';
  end if;
  perform public.consume_rate_limit('message');
  insert into public.seller_lead_messages (lead_id, sender, body) values (p_lead_id, 'seller', btrim(p_body));
end;
$$;

create or replace function public.set_saved_listing(p_listing_id uuid, p_saved boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign-in required' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text || ':' || p_listing_id::text, 0));
  if p_saved then
    perform public.consume_rate_limit('save');
    perform public.ensure_buyer_lead(p_listing_id);
    insert into public.saved_listings (buyer_id, listing_id) values (auth.uid(), p_listing_id) on conflict do nothing;
  else
    delete from public.saved_listings where buyer_id = auth.uid() and listing_id = p_listing_id;
    delete from public.seller_leads where buyer_id = auth.uid() and listing_id = p_listing_id
      and last_message_at is null and inquiry_status = 'none';
  end if;
end;
$$;

-- create or replace keeps privileges; restate them so the boundary is explicit.
revoke all on function public.contact_listing(uuid, text, boolean, bigint) from public, anon;
grant execute on function public.contact_listing(uuid, text, boolean, bigint) to authenticated;
revoke all on function public.send_buyer_message(uuid, text) from public, anon;
grant execute on function public.send_buyer_message(uuid, text) to authenticated;
revoke all on function public.send_seller_message(uuid, text) from public, anon;
grant execute on function public.send_seller_message(uuid, text) to authenticated;
revoke all on function public.set_saved_listing(uuid, boolean) from public, anon;
grant execute on function public.set_saved_listing(uuid, boolean) to authenticated;

commit;
