create table public.sponsorships (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users on delete set null,
  slot integer check (slot between 1 and 20) unique,
  state text not null check (state in ('seed', 'checkout', 'active', 'paused', 'ended')),
  created_at timestamptz not null default now(),
  checkout_expires_at timestamptz,
  checkout_session_id text unique,
  stripe_subscription_id text unique,
  stripe_customer_id text,
  stripe_event_at bigint not null default 0,
  name text check (char_length(name) between 1 and 60),
  headline text check (char_length(headline) between 1 and 150),
  website_url text check (website_url ~ '^https?://' and char_length(website_url) <= 2048),
  logo_url text check (logo_url ~ '^(https://|/assets/)' and char_length(logo_url) <= 2048),
  background_color text not null default '#e6fff0' check (background_color ~ '^#[0-9a-fA-F]{6}$'),
  home_positions integer[] not null default '{}',
  marketplace_positions integer[] not null default '{}',
  check ((state = 'ended') = (slot is null))
);

create unique index sponsorships_one_per_owner on public.sponsorships (owner_id)
where state in ('checkout', 'active', 'paused');

alter table public.sponsorships enable row level security;
revoke all on public.sponsorships from anon, authenticated;
grant select, insert, update on public.sponsorships to service_role;

create function public.sponsorship_catalog()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'capacity', 20,
    'available', 20 - count(*) filter (
      where slot is not null and not (
        state = 'checkout' and checkout_session_id is null and checkout_expires_at <= now()
      )
    ),
    'cards', coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'name', name, 'headline', headline, 'website_url', website_url,
      'logo_url', logo_url, 'background_color', background_color,
      'home_positions', home_positions, 'marketplace_positions', marketplace_positions
    ) order by slot) filter (where state in ('seed', 'active') and name is not null), '[]'::jsonb)
  )
  from public.sponsorships;
$$;

revoke all on function public.sponsorship_catalog() from public;
grant execute on function public.sponsorship_catalog() to anon, authenticated;

create function public.reserve_sponsorship(p_owner uuid)
returns jsonb
language plpgsql set search_path = ''
as $$
declare
  reservation public.sponsorships;
  free_slot integer;
begin
  perform pg_advisory_xact_lock(69021044);
  -- No Checkout URL is handed to the sponsor until its session ID is saved.
  update public.sponsorships set state = 'ended', slot = null
  where state = 'checkout' and checkout_session_id is null and checkout_expires_at <= now();

  select * into reservation from public.sponsorships
  where owner_id = p_owner and slot is not null;
  if found then return to_jsonb(reservation); end if;

  select position into free_slot from generate_series(1, 20) as slots(position)
  where not exists (select 1 from public.sponsorships where slot = position)
  order by position limit 1;
  if free_slot is null then return null; end if;

  insert into public.sponsorships (owner_id, slot, state, checkout_expires_at)
  values (p_owner, free_slot, 'checkout', date_trunc('second', now()) + interval '35 minutes')
  returning * into reservation;
  return to_jsonb(reservation);
end;
$$;

revoke all on function public.reserve_sponsorship(uuid) from public;
grant execute on function public.reserve_sponsorship(uuid) to service_role;

insert into public.sponsorships
  (slot, state, name, headline, website_url, logo_url, background_color, home_positions, marketplace_positions)
values
  (1, 'seed', 'Chargeback.io', 'Prevent chargebacks on autopilot', 'https://chargeback.io/', '/assets/sponsor-0.png', '#e5ecfe', '{7}', '{9}'),
  (2, 'seed', 'GojiberryAI', 'Find warm leads and book sales calls automatically', 'https://gojiberry.ai/', '/assets/sponsor-1.png', '#ffe6e6', '{5}', '{}'),
  (3, 'seed', 'Hugo AI', 'Hugo automates customer support, you ship features', 'https://hugo.ai/', '/assets/sponsor-2.png', '#e6f1ff', '{}', '{7}'),
  (4, 'seed', 'Virlo', 'Track, manage, leverage short-form data.', 'https://virlo.ai/', '/assets/sponsor-3.png', '#ffe6f8', '{1}', '{6}'),
  (5, 'seed', 'Blotato', 'Social Media API & MCP for Claude', 'https://www.blotato.com/', '/assets/sponsor-4.png', '#ffe6f2', '{8}', '{}'),
  (6, 'seed', 'CREEM', 'Sell Software globally, grow your revenue', 'https://creem.io/', '/assets/sponsor-5.png', '#ffe6f2', '{}', '{3}'),
  (7, 'seed', 'Higgsfield', 'Create AI videos and images with Higgsfield', 'https://higgsfield.ai/marclou', '/assets/sponsor-6.png', '#e6fff0', '{3,4,6}', '{1,2}'),
  (8, 'seed', 'BlogSEO', 'SEO on autopilot: Rank #1 on Google & ChatGPT (Try for free, 2-minute setup)', 'https://blogseo.io/', '/assets/sponsor-7.png', '#fff7e4', '{9}', '{5}'),
  (9, 'seed', 'Fuse AI', '10x revenue with AI agents built to find, enrich, and engage customers.', 'https://fuseai.com/', '/assets/sponsor-8.png', '#f9e6ff', '{2}', '{4}'),
  (10, 'seed', 'AiSDR INC.', 'AI sales outreach you can trust', 'https://aisdr.com/', '/assets/reference-6.webp', '#f9e6ff', '{}', '{8}');
