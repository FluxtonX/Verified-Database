begin;

alter table public.startup_submissions
  add column imported_logo_url text check (char_length(imported_logo_url) <= 2048 and imported_logo_url ~ '^https://[^[:space:]]+$');

grant update (imported_logo_url) on public.startup_submissions to authenticated;

create function public.save_revenuecat_app_profile(
  p_startup_id uuid, p_external_id text, p_name text, p_website text, p_description text,
  p_handle text, p_metrics jsonb, p_synced_at timestamptz, p_app_store_url text,
  p_google_play_url text, p_logo_url text, p_mobile_app boolean
) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  target uuid;
begin
  -- A store URL can also belong to another draft. Import the source regardless,
  -- then use the URL as a fallback only when it is available for this draft.
  target := public.save_startup_payment_source(p_startup_id, 'revenuecat', p_external_id,
    p_name, null, p_description, null, p_handle, p_metrics, p_synced_at);

  update public.startup_submissions as draft set
    description = coalesce(nullif(draft.description, ''), p_description, ''),
    app_store_url = coalesce(draft.app_store_url, p_app_store_url),
    google_play_url = coalesce(draft.google_play_url, p_google_play_url),
    imported_logo_url = coalesce(draft.imported_logo_url, p_logo_url),
    mobile_app = draft.mobile_app or (
      draft.app_store_url is null and draft.google_play_url is null and coalesce(p_mobile_app, false)
    ),
    markets = case
      when cardinality(draft.markets) = 0 and coalesce(p_mobile_app, false) then array['Mobile Apps']
      else draft.markets
    end
  where draft.id = target and draft.owner_id = (select auth.uid());

  if p_website is not null then
    begin
      update public.startup_submissions set website_url = p_website
      where id = target and owner_id = (select auth.uid()) and website_url is null;
    exception when unique_violation then
      -- Store links are still available on the profile.
      null;
    end;
  end if;

  return target;
end;
$$;

revoke all on function public.save_revenuecat_app_profile(uuid, text, text, text, text, text, jsonb, timestamptz, text, text, text, boolean) from public, anon;
grant execute on function public.save_revenuecat_app_profile(uuid, text, text, text, text, text, jsonb, timestamptz, text, text, text, boolean) to authenticated;

commit;
