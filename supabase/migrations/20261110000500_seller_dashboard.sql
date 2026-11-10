begin;

alter table public.profiles
  add column bio text not null default '' check (char_length(bio) <= 180),
  add column linkedin_url text check (char_length(linkedin_url) <= 512 and linkedin_url ~ '^https://www\.linkedin\.com/in/'),
  add column notify_messages boolean not null default true,
  add column notify_saved boolean not null default true,
  add column timezone text not null default 'UTC' check (char_length(timezone) between 1 and 64),
  add column deletion_requested_at timestamptz;

grant select on public.profiles to authenticated;
grant insert (id, display_name, avatar_url, x_handle, bio, linkedin_url, notify_messages, notify_saved, timezone, deletion_requested_at)
  on public.profiles to authenticated;
grant update (id, display_name, avatar_url, x_handle, bio, linkedin_url, notify_messages, notify_saved, timezone, deletion_requested_at)
  on public.profiles to authenticated;

create policy "Account owners read their profile" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "Account owners create their profile" on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy "Account owners edit their profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-pictures', 'profile-pictures', true, 819200, array['image/png']);

create policy "Account owners read their picture metadata" on storage.objects for select to authenticated
  using (bucket_id = 'profile-pictures' and name = (select auth.uid())::text || '.png');
create policy "Account owners upload their picture" on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-pictures' and name = (select auth.uid())::text || '.png');
create policy "Account owners replace their picture" on storage.objects for update to authenticated
  using (bucket_id = 'profile-pictures' and name = (select auth.uid())::text || '.png')
  with check (bucket_id = 'profile-pictures' and name = (select auth.uid())::text || '.png');

create table public.seller_leads (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.sale_listings on delete cascade,
  seller_id uuid not null references auth.users on delete cascade,
  buyer_id uuid not null references auth.users on delete cascade,
  buyer_name text not null check (char_length(btrim(buyer_name)) between 1 and 100),
  startup_name text not null check (char_length(btrim(startup_name)) between 1 and 100),
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  last_sender text check (last_sender in ('buyer', 'seller')),
  archived boolean not null default false,
  check (seller_id <> buyer_id),
  unique (listing_id, buyer_id)
);
create index seller_leads_owner_idx on public.seller_leads (seller_id, created_at desc);

create table public.seller_lead_messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.seller_leads on delete cascade,
  sender text not null check (sender in ('buyer', 'seller')),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index seller_lead_messages_lead_idx on public.seller_lead_messages (lead_id, created_at desc, id);

create table public.seller_feedback (
  owner_id uuid not null references auth.users on delete cascade,
  slot smallint not null check (slot between 1 and 10),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  primary key (owner_id, slot)
);

alter table public.seller_leads enable row level security;
alter table public.seller_lead_messages enable row level security;
alter table public.seller_feedback enable row level security;
revoke all on public.seller_leads, public.seller_lead_messages, public.seller_feedback from public, anon, authenticated;
grant all on public.seller_leads, public.seller_lead_messages, public.seller_feedback to service_role;
grant select (id, buyer_name, startup_name, created_at, last_message_at, last_sender, archived) on public.seller_leads to authenticated;
grant update (archived) on public.seller_leads to authenticated;
grant select on public.seller_lead_messages, public.seller_feedback to authenticated;

create policy "Sellers read their leads" on public.seller_leads for select to authenticated using (seller_id = (select auth.uid()));
create policy "Sellers archive their leads" on public.seller_leads for update to authenticated
  using (seller_id = (select auth.uid())) with check (seller_id = (select auth.uid()));
create policy "Sellers read their lead messages" on public.seller_lead_messages for select to authenticated
  using (exists (select 1 from public.seller_leads lead where lead.id = lead_id));
create policy "Sellers read their feedback" on public.seller_feedback for select to authenticated using (owner_id = (select auth.uid()));

create function public.update_seller_lead_after_message() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.seller_leads set last_message_at = new.created_at, last_sender = new.sender
  where id = new.lead_id and (last_message_at is null or last_message_at <= new.created_at);
  return new;
end;
$$;
revoke all on function public.update_seller_lead_after_message() from public, anon, authenticated;
create trigger seller_lead_after_message after insert on public.seller_lead_messages
  for each row execute function public.update_seller_lead_after_message();

create function public.send_seller_message(p_lead_id uuid, p_body text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.seller_leads where id = p_lead_id and seller_id = auth.uid()
  ) then
    raise exception 'Conversation unavailable' using errcode = '42501';
  end if;
  insert into public.seller_lead_messages (lead_id, sender, body) values (p_lead_id, 'seller', btrim(p_body));
end;
$$;
revoke all on function public.send_seller_message(uuid, text) from public, anon;
grant execute on function public.send_seller_message(uuid, text) to authenticated;

create function public.submit_seller_feedback(p_body text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  sender uuid := auth.uid();
  next_slot smallint;
begin
  if sender is null then raise exception 'Sign-in required' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('seller-feedback:' || sender::text, 0));
  select coalesce(max(slot), 0) + 1 into next_slot from public.seller_feedback where owner_id = sender;
  if next_slot > 10 then raise exception 'Feedback limit reached' using errcode = 'P0001'; end if;
  insert into public.seller_feedback (owner_id, slot, body) values (sender, next_slot, btrim(p_body));
end;
$$;
revoke all on function public.submit_seller_feedback(text) from public, anon;
grant execute on function public.submit_seller_feedback(text) to authenticated;

grant update (wants_sale) on public.startup_submissions to authenticated;

commit;
