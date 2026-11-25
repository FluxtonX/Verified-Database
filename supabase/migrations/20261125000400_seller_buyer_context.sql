-- F-28 (2026-11-25 audit): sellers see who they're talking to. For each of the caller's own leads,
-- expose the buyer's *buyer profile* (what buyers fill in to introduce themselves to sellers).
-- Nothing else about the buyer (email, user ID, seller profile, other activity) is exposed.
begin;

create view public.seller_lead_buyers with (security_barrier = true) as
select l.id as lead_id, b.display_name, b.bio, b.budget_min, b.budget_max, b.categories
from public.seller_leads l
join public.buyer_profiles b on b.id = l.buyer_id
where l.seller_id = (select auth.uid());

revoke all on public.seller_lead_buyers from public, anon;
grant select on public.seller_lead_buyers to authenticated;

commit;
