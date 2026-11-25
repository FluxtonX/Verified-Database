-- F-13 (2026-11-25 audit): withdrawing a listing used to decline open inquiries silently.
-- Buyers who were talking to the seller now get a message in their thread explaining why.
begin;

create or replace function public.withdraw_startup_listing(p_listing uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign-in required' using errcode = '42501'; end if;
  update public.sale_listings l set status = 'withdrawn' from public.startups s
    where l.id = p_listing and l.startup_id = s.id and s.owner_id = auth.uid() and l.status = 'active';
  if not found then raise exception 'Listing unavailable' using errcode = '42501'; end if;
  -- Tell every buyer with an active inquiry or an ongoing conversation, before closing inquiries.
  insert into public.seller_lead_messages (lead_id, sender, body)
    select id, 'seller', case when inquiry_status in ('open', 'accepted')
        then 'The seller withdrew this listing from the marketplace, so this acquisition inquiry is closed.'
        else 'The seller withdrew this listing from the marketplace.' end
    from public.seller_leads
    where listing_id = p_listing and (inquiry_status in ('open', 'accepted') or last_message_at is not null);
  update public.seller_leads set inquiry_status = 'declined' where listing_id = p_listing and inquiry_status in ('open','accepted');
end;
$$;

revoke all on function public.withdraw_startup_listing(uuid) from public, anon;
grant execute on function public.withdraw_startup_listing(uuid) to authenticated;

commit;
