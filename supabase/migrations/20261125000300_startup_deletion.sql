-- F-10 (2026-11-25 audit): founders can delete a startup draft and disconnect a payment provider.
begin;

-- Founders may remove logo files under their own folder, including after the draft is gone.
-- Postgres only deletes rows the caller can also select, so reading the folder is allowed too.
create policy "Founders read their logo folder" on storage.objects
  for select to authenticated using (
    bucket_id = 'startup-draft-logos' and split_part(name, '/', 1) = (select auth.uid())::text
  );
create policy "Founders delete their startup logos" on storage.objects
  for delete to authenticated using (
    bucket_id = 'startup-draft-logos' and split_part(name, '/', 1) = (select auth.uid())::text
  );

-- Delete a draft and its payment sources. A live listing must be withdrawn first. If the startup
-- was ever published, it's taken off the leaderboard; the record stays for existing buyer threads.
create function public.delete_startup_draft(p_submission uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare founder uuid := auth.uid();
begin
  if founder is null then raise exception 'Sign-in required' using errcode = '42501'; end if;
  perform 1 from public.startup_submissions where id = p_submission and owner_id = founder for update;
  if not found then raise exception 'Startup unavailable' using errcode = '42501'; end if;
  if exists (select 1 from public.startups s join public.sale_listings l on l.startup_id = s.id
      where s.submission_id = p_submission and l.status = 'active') then
    raise exception 'Withdraw the listing before deleting this startup' using errcode = 'P0006';
  end if;
  update public.startups set published_at = null where submission_id = p_submission and owner_id = founder;
  delete from public.startup_submissions where id = p_submission and owner_id = founder;
end;
$$;
revoke all on function public.delete_startup_draft(uuid) from public, anon;
grant execute on function public.delete_startup_draft(uuid) to authenticated;

-- Disconnect one provider. A draft must keep a website or another provider identity.
create function public.disconnect_payment_source(p_source uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare founder uuid := auth.uid(); source public.startup_payment_sources;
begin
  if founder is null then raise exception 'Sign-in required' using errcode = '42501'; end if;
  select * into source from public.startup_payment_sources where id = p_source and owner_id = founder for update;
  if source.id is null then raise exception 'Provider unavailable' using errcode = '42501'; end if;
  begin
    update public.startup_submissions set
      stripe_account_id = case when source.provider = 'stripe' and stripe_account_id = source.external_id then null else stripe_account_id end,
      revenuecat_project_id = case when source.provider = 'revenuecat' and revenuecat_project_id = source.external_id then null else revenuecat_project_id end
    where id = source.startup_id and owner_id = founder;
  exception when check_violation then
    raise exception 'Add a website before disconnecting this provider' using errcode = 'P0007';
  end;
  delete from public.startup_payment_sources where id = source.id;
end;
$$;
revoke all on function public.disconnect_payment_source(uuid) from public, anon;
grant execute on function public.disconnect_payment_source(uuid) to authenticated;

commit;
