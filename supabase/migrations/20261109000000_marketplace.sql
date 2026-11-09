begin;

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text check (char_length(display_name) between 1 and 100),
  avatar_url text check (avatar_url ~ '^https://[^[:space:]]+$'),
  x_handle text check (x_handle ~ '^[A-Za-z0-9_]{1,15}$'),
  created_at timestamptz not null default now()
);

create table public.categories (
  name text primary key check (char_length(name) between 1 and 100)
);

insert into public.categories (name) values
  ('Artificial Intelligence'), ('Content Creation'), ('Marketing'), ('SaaS'),
  ('E-commerce'), ('Productivity'), ('Marketplace'), ('Developer Tools'),
  ('Fintech'), ('Analytics'), ('Other');

-- A founder can save one private draft per website. Only trusted operators
-- can turn a submission into a published startup or a sale listing.
create table public.startup_submissions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  website_url text not null check (char_length(website_url) <= 2048 and website_url ~ '^https?://[^[:space:]]+$'),
  category text not null references public.categories,
  x_handle text check (x_handle ~ '^[A-Za-z0-9_]{1,15}$'),
  provider text not null check (provider = 'stripe'),
  anonymous boolean not null default false,
  wants_sale boolean not null default false,
  addon_interests text[] not null default '{}' check (
    addon_interests <@ array['dofollow', 'ai-visibility', 'sponsor']::text[]
  ),
  created_at timestamptz not null default now(),
  unique (owner_id, website_url)
);

create table public.startups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  description text not null default '',
  website_url text check (website_url ~ '^https?://[^[:space:]]+$'),
  logo_url text,
  category text not null references public.categories,
  founded_on date,
  country text check (country ~ '^[A-Z]{2}$'),
  audience text check (audience in ('B2B', 'B2C', 'Both')),
  mobile_app boolean,
  anonymous boolean not null default false,
  published_at timestamptz
);

-- One trusted USD snapshot per startup and measurement date. Revenue over the
-- trailing 30 days can include one-off payments. MRR is recurring revenue.
create table public.revenue_snapshots (
  startup_id uuid not null references public.startups on delete cascade,
  measured_on date not null,
  provider text not null check (btrim(provider) <> ''),
  verified_at timestamptz not null,
  revenue_30d_cents bigint not null check (revenue_30d_cents between 0 and 9007199254740991),
  mrr_cents bigint check (mrr_cents between 0 and 9007199254740991),
  revenue_growth_pct numeric(12, 2) check (revenue_growth_pct >= -100),
  mrr_growth_pct numeric(12, 2) check (mrr_growth_pct >= -100),
  includes_nonrecurring boolean not null default false,
  primary key (startup_id, measured_on)
);

create table public.sale_listings (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'active', 'sold', 'withdrawn')),
  asking_price_cents bigint not null check (asking_price_cents between 1 and 9007199254740991),
  previous_price_cents bigint check (previous_price_cents between 1 and 9007199254740991),
  profit_margin_pct numeric(12, 2) check (profit_margin_pct <= 100),
  listed_at timestamptz,
  featured boolean not null default false,
  public_preview boolean not null default false,
  views integer not null default 0 check (views >= 0),
  offers integer not null default 0 check (offers >= 0),
  check (status <> 'active' or listed_at is not null)
);

create unique index sale_listings_one_active_per_startup
  on public.sale_listings (startup_id) where status = 'active';
create index sale_listings_startup_id on public.sale_listings (startup_id);

create table public.activity_posts (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups on delete cascade,
  author_id uuid references public.profiles on delete set null,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  image_url text,
  published_at timestamptz
);

create table public.activity_likes (
  post_id uuid not null references public.activity_posts on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  primary key (post_id, user_id)
);
create index activity_likes_user_id on public.activity_likes (user_id);

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.startup_submissions enable row level security;
alter table public.startups enable row level security;
alter table public.revenue_snapshots enable row level security;
alter table public.sale_listings enable row level security;
alter table public.activity_posts enable row level security;
alter table public.activity_likes enable row level security;

revoke all on public.profiles, public.categories, public.startup_submissions, public.startups,
  public.revenue_snapshots, public.sale_listings, public.activity_posts, public.activity_likes
  from public, anon, authenticated;
grant all on public.profiles, public.categories, public.startup_submissions, public.startups,
  public.revenue_snapshots, public.sale_listings, public.activity_posts, public.activity_likes
  to service_role;

grant select on public.categories to anon, authenticated;
create policy "Anyone can read categories" on public.categories for select to anon, authenticated using (true);

grant select on public.startup_submissions to authenticated;
grant insert (name, website_url, category, x_handle, provider, anonymous, wants_sale, addon_interests)
  on public.startup_submissions to authenticated;
create policy "Founders read their drafts" on public.startup_submissions
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Founders save their drafts" on public.startup_submissions
  for insert to authenticated with check ((select auth.uid()) = owner_id);

-- These owner-executed views are the Data API boundary. Their projections
-- intentionally omit owner IDs, private company identity and provider details.
create view public.leaderboard with (security_barrier = true) as
select s.id, case when s.anonymous then 'Anonymous startup' else s.name end as name,
  case when not s.anonymous then s.description end as description,
  case when not s.anonymous then s.logo_url end as logo,
  case when not s.anonymous then p.display_name end as founder,
  case when not s.anonymous then p.avatar_url end as avatar,
  s.anonymous, r.mrr_cents, r.mrr_growth_pct, r.includes_nonrecurring,
  exists (select 1 from public.sale_listings l where l.startup_id = s.id and l.status = 'active'
    and l.listed_at <= now()) as for_sale
from public.startups s
join lateral (
  select mrr_cents, mrr_growth_pct, includes_nonrecurring
  from public.revenue_snapshots where startup_id = s.id
  order by measured_on desc limit 1
) r on r.mrr_cents is not null
left join public.profiles p on p.id = s.owner_id
where s.published_at <= now();

create view public.marketplace with (security_barrier = true) as
select l.id, case when s.anonymous then 'Unnamed Company' else s.name end as name,
  case when not s.anonymous then s.description end as description,
  case when not s.anonymous then s.logo_url end as logo,
  s.category, case when not s.anonymous then s.founded_on end as founded_on,
  case when not s.anonymous then s.country end as country,
  s.audience, s.mobile_app, s.anonymous,
  l.listed_at, l.featured, l.views, l.offers, l.profit_margin_pct,
  l.asking_price_cents, l.previous_price_cents,
  r.revenue_30d_cents, r.mrr_cents, r.revenue_growth_pct,
  round(l.asking_price_cents / nullif(r.revenue_30d_cents * 12::numeric, 0), 2) as multiple
from public.sale_listings l
join public.startups s on s.id = l.startup_id
join lateral (
  select revenue_30d_cents, mrr_cents, revenue_growth_pct
  from public.revenue_snapshots where startup_id = s.id
  order by measured_on desc limit 1
) r on true
where l.status = 'active' and l.listed_at <= now() and s.published_at <= now()
  and (l.public_preview or (select auth.uid()) is not null);

create view public.marketplace_updates with (security_barrier = true) as
select a.id, a.body, a.image_url, a.published_at,
  coalesce(p.display_name, 'Founder') as author, p.avatar_url as avatar,
  s.name as project, s.logo_url as logo
from public.activity_posts a
join public.startups s on s.id = a.startup_id
left join public.profiles p on p.id = a.author_id
where a.published_at <= now() and s.published_at <= now() and not s.anonymous;

grant select on public.activity_likes to authenticated;
grant insert (post_id), delete on public.activity_likes to authenticated;
create policy "Members read their likes" on public.activity_likes for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Members like public updates" on public.activity_likes for insert to authenticated
  with check ((select auth.uid()) = user_id
    and exists (select 1 from public.marketplace_updates p where p.id = post_id));
create policy "Members remove their likes" on public.activity_likes for delete to authenticated
  using ((select auth.uid()) = user_id);

create view public.activity_feed with (security_barrier = true) as
select p.*,
  (select count(*) from public.activity_likes l where l.post_id = p.id) as likes,
  exists (select 1 from public.activity_likes l where l.post_id = p.id
    and l.user_id = (select auth.uid())) as liked
from public.marketplace_updates p;

revoke all on public.leaderboard, public.marketplace, public.marketplace_updates, public.activity_feed
  from public, anon, authenticated;
grant select on public.leaderboard, public.marketplace, public.marketplace_updates, public.activity_feed
  to anon, authenticated;

commit;
