begin;

alter table public.startup_submissions
  add column revenuecat_project_id text,
  add column app_store_url text check (char_length(app_store_url) <= 2048 and app_store_url ~ '^https://apps\.apple\.com/'),
  add column google_play_url text check (char_length(google_play_url) <= 2048 and google_play_url ~ '^https://play\.google\.com/'),
  add column audience_description text not null default '' check (char_length(audience_description) <= 500),
  add column pricing text not null default '' check (char_length(pricing) <= 500),
  add column additional_info text not null default '' check (char_length(additional_info) <= 500),
  add constraint startup_submissions_id_owner_key unique (id, owner_id),
  drop constraint startup_submissions_check,
  add constraint startup_submissions_stripe_id_check check (
    stripe_account_id is null or (stripe_account_id ~ '^acct_[A-Za-z0-9]+$' and provider = 'stripe')
  ),
  add constraint startup_submissions_revenuecat_id_check check (
    revenuecat_project_id is null or (revenuecat_project_id ~ '^proj[A-Za-z0-9_-]{3,100}$' and provider = 'revenuecat')
  ),
  drop constraint startup_submissions_website_or_stripe,
  add constraint startup_submissions_website_or_source check (
    website_url is not null or stripe_account_id is not null or revenuecat_project_id is not null
  );

grant insert (revenuecat_project_id) on public.startup_submissions to authenticated;
grant update (app_store_url, google_play_url, audience_description, pricing, additional_info) on public.startup_submissions to authenticated;

create table public.startup_payment_sources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  startup_id uuid not null,
  provider text not null check (provider in ('stripe', 'revenuecat')),
  external_id text not null check (char_length(external_id) between 1 and 128),
  name text not null check (char_length(name) between 1 and 100),
  metrics jsonb check (jsonb_typeof(metrics) = 'object' and pg_column_size(metrics) < 524288),
  synced_at timestamptz,
  foreign key (startup_id, owner_id) references public.startup_submissions (id, owner_id) on delete cascade,
  unique (owner_id, provider, external_id)
);

create index startup_payment_sources_startup_id_idx on public.startup_payment_sources (startup_id);
alter table public.startup_payment_sources enable row level security;
revoke all on public.startup_payment_sources from public, anon, authenticated;
grant select on public.startup_payment_sources to authenticated;
grant insert (startup_id, provider, external_id, name, metrics, synced_at) on public.startup_payment_sources to authenticated;
grant update (name, metrics, synced_at) on public.startup_payment_sources to authenticated;
grant all on public.startup_payment_sources to service_role;

create policy "Founders manage their payment sources" on public.startup_payment_sources
  to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

insert into public.startup_payment_sources (owner_id, startup_id, provider, external_id, name)
select owner_id, id, 'stripe', stripe_account_id, name
from public.startup_submissions where stripe_account_id is not null;

create function public.save_startup_payment_source(
  p_startup_id uuid, p_provider text, p_external_id text, p_name text, p_website text,
  p_description text, p_country text, p_handle text, p_metrics jsonb, p_synced_at timestamptz
) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  founder uuid := auth.uid();
  target uuid;
begin
  if founder is null then raise exception 'Sign-in required' using errcode = '42501'; end if;
  if p_provider not in ('stripe', 'revenuecat') then raise exception 'Unsupported provider'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    founder::text || ':' || p_provider || ':' || p_external_id, 0
  ));

  select startup_id into target from public.startup_payment_sources
    where owner_id = founder and provider = p_provider and external_id = p_external_id;

  if target is not null and p_startup_id is not null and target <> p_startup_id then
    raise exception 'Source already linked to another startup' using errcode = 'P0003';
  end if;

  if target is null and p_startup_id is not null then
    select id into target from public.startup_submissions where id = p_startup_id and owner_id = founder;
    if target is null then raise exception 'Startup not found' using errcode = '42501'; end if;
  end if;

  if target is null and p_provider = 'stripe' and p_website is not null then
    -- Reuse an older Stripe draft that has never been associated with an account.
    select draft.id into target from public.startup_submissions draft
      where draft.owner_id = founder and draft.website_url = p_website
        and draft.provider = 'stripe' and draft.stripe_account_id is null
        and not exists (
          select 1 from public.startup_payment_sources source where source.startup_id = draft.id
        )
      for update;
    if target is not null then
      update public.startup_submissions set stripe_account_id = p_external_id where id = target;
    end if;
  end if;

  if target is null then
    insert into public.startup_submissions (name, website_url, category, provider, x_handle,
      stripe_account_id, revenuecat_project_id, description, country)
    values (p_name, p_website, 'Other', p_provider, p_handle,
      case when p_provider = 'stripe' then p_external_id end,
      case when p_provider = 'revenuecat' then p_external_id end,
      p_description, p_country)
    returning id into target;
  end if;

  insert into public.startup_payment_sources as source (startup_id, provider, external_id, name, metrics, synced_at)
    values (target, p_provider, p_external_id, p_name, p_metrics, p_synced_at)
    on conflict (owner_id, provider, external_id) do update
      set name = excluded.name, metrics = excluded.metrics, synced_at = excluded.synced_at
      where source.startup_id = excluded.startup_id and
        (source.synced_at is null or source.synced_at <= excluded.synced_at);

  return target;
end;
$$;

revoke all on function public.save_startup_payment_source(uuid, text, text, text, text, text, text, text, jsonb, timestamptz) from public, anon;
grant execute on function public.save_startup_payment_source(uuid, text, text, text, text, text, text, text, jsonb, timestamptz) to authenticated;

commit;
