begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('startup-draft-logos', 'startup-draft-logos', false, 819200, array['image/png']);

create policy "Founders read their startup logos" on storage.objects
  for select to authenticated using (
    bucket_id = 'startup-draft-logos' and exists (
      select 1 from public.startup_submissions draft
      where draft.owner_id = (select auth.uid())
        and objects.name = draft.owner_id::text || '/' || draft.id::text || '.png'
    )
  );

create policy "Founders upload their startup logos" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'startup-draft-logos' and exists (
      select 1 from public.startup_submissions draft
      where draft.owner_id = (select auth.uid())
        and objects.name = draft.owner_id::text || '/' || draft.id::text || '.png'
    )
  );

create policy "Founders replace their startup logos" on storage.objects
  for update to authenticated using (
    bucket_id = 'startup-draft-logos' and exists (
      select 1 from public.startup_submissions draft
      where draft.owner_id = (select auth.uid())
        and objects.name = draft.owner_id::text || '/' || draft.id::text || '.png'
    )
  ) with check (
    bucket_id = 'startup-draft-logos' and exists (
      select 1 from public.startup_submissions draft
      where draft.owner_id = (select auth.uid())
        and objects.name = draft.owner_id::text || '/' || draft.id::text || '.png'
    )
  );

commit;
