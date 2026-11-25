-- Trust fixes from the 2026-11-25 audit (findings F-02, F-03, F-04; also F-22).
-- Safe to run once on any database that has the earlier migrations. Review before applying to production.
begin;

-- F-02: the seed rows advertised real companies that never bought a sponsorship.
-- The app already hides them; this removes them and frees their slots.
delete from public.sponsorships where state = 'seed';

-- F-03: founders can now choose to list anonymously. The marketplace and leaderboard views
-- already redact identity for anonymous startups; the choice takes effect on the next publish.
grant update (anonymous) on public.startup_submissions to authenticated;

-- F-04: expose when each leaderboard figure was verified, so the UI can show "as of" dates.
-- Existing columns keep their order; measured_on is appended.
create or replace view public.leaderboard with (security_barrier = true) as
select s.id, case when s.anonymous then 'Anonymous startup' else s.name end as name,
  case when not s.anonymous then s.description end as description,
  case when not s.anonymous then s.logo_url end as logo,
  case when not s.anonymous then p.display_name end as founder,
  case when not s.anonymous then p.avatar_url end as avatar,
  s.anonymous, r.mrr_cents, r.mrr_growth_pct, r.includes_nonrecurring,
  exists (select 1 from public.sale_listings l where l.startup_id = s.id and l.status = 'active'
    and l.listed_at <= now()) as for_sale,
  r.measured_on
from public.startups s
join lateral (
  select mrr_cents, mrr_growth_pct, includes_nonrecurring, measured_on
  from public.revenue_snapshots where startup_id = s.id
  order by measured_on desc limit 1
) r on r.mrr_cents is not null
left join public.profiles p on p.id = s.owner_id
where s.published_at <= now();

-- F-04: compute month-over-month growth from an earlier verification instead of always storing null.
-- F-22: relisting a withdrawn startup counts as newly listed.
create or replace function public.publish_startup_listing(p_owner uuid, p_submission uuid, p_source uuid,
  p_price bigint, p_revenue bigint, p_mrr bigint, p_logo text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare draft public.startup_submissions; source public.startup_payment_sources; company uuid; listing uuid;
  previous public.revenue_snapshots; revenue_growth numeric; mrr_growth numeric;
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
  -- Month-over-month growth: compare with the verification closest to 30 days earlier
  -- (25–35 days back). Without one, growth stays unknown rather than invented.
  select * into previous from public.revenue_snapshots
    where startup_id = company and measured_on between current_date - 35 and current_date - 25
    order by abs((current_date - 30) - measured_on), measured_on desc limit 1;
  if previous.revenue_30d_cents > 0 then
    revenue_growth := least(round((p_revenue - previous.revenue_30d_cents) * 100.0 / previous.revenue_30d_cents, 2), 9999999999.99);
  end if;
  if p_mrr is not null and previous.mrr_cents > 0 then
    mrr_growth := least(round((p_mrr - previous.mrr_cents) * 100.0 / previous.mrr_cents, 2), 9999999999.99);
  end if;
  insert into public.revenue_snapshots (startup_id, measured_on, provider, verified_at, revenue_30d_cents, mrr_cents,
    revenue_growth_pct, mrr_growth_pct, includes_nonrecurring)
  values (company, current_date, source.provider, now(), p_revenue, p_mrr, revenue_growth, mrr_growth, true)
  on conflict (startup_id, measured_on) do update set provider = excluded.provider, verified_at = excluded.verified_at,
    revenue_30d_cents = excluded.revenue_30d_cents, mrr_cents = excluded.mrr_cents,
    revenue_growth_pct = excluded.revenue_growth_pct, mrr_growth_pct = excluded.mrr_growth_pct, includes_nonrecurring = true;
  select id into listing from public.sale_listings where startup_id = company order by listed_at desc nulls last, id limit 1 for update;
  if listing is null then
    insert into public.sale_listings (startup_id, status, asking_price_cents, profit_margin_pct, listed_at, public_preview)
      values (company, 'active', p_price, draft.profit_margin_pct, now(), true) returning id into listing;
  else
    update public.sale_listings set status = 'active',
      previous_price_cents = case when asking_price_cents <> p_price then asking_price_cents else previous_price_cents end,
      asking_price_cents = p_price, profit_margin_pct = draft.profit_margin_pct,
      -- A relisting counts as newly listed; a price update on a live listing keeps its date.
      listed_at = case when status = 'active' then coalesce(listed_at, now()) else now() end where id = listing;
  end if;
  update public.startup_submissions set wants_sale = true where id = draft.id;
  return listing;
end;
$$;

-- create or replace keeps existing privileges; restate them so the boundary is explicit.
revoke all on function public.publish_startup_listing(uuid, uuid, uuid, bigint, bigint, bigint, text) from public, anon, authenticated;
grant execute on function public.publish_startup_listing(uuid, uuid, uuid, bigint, bigint, bigint, text) to service_role;

commit;
