begin;

-- Imported accounts can have incomplete profiles. Keep these rows as private drafts.
alter table public.startup_submissions
  alter column website_url drop not null,
  add column stripe_account_id text check (stripe_account_id ~ '^acct_[A-Za-z0-9]+$' and provider = 'stripe'),
  add column description text not null default '' check (char_length(description) <= 500),
  add column country text check (country ~ '^[A-Z]{2}$'),
  add column mobile_app boolean not null default false,
  add column funding text check (funding in ('bootstrapped', 'vc-backed')),
  add column team_size text check (team_size in ('1', '2–5', '6–10', '11–25', '26–50', '51+')),
  add column founded_on date,
  add column profit_margin_pct numeric(7,2) check (profit_margin_pct <= 100),
  add column markets text[] not null default '{}' check (cardinality(markets) <= 5),
  add column tech_stack text[] not null default '{}' check (cardinality(tech_stack) <= 20),
  add column marketing_channels text[] not null default '{}' check (cardinality(marketing_channels) <= 15),
  add column value_proposition text not null default '' check (char_length(value_proposition) <= 500),
  add column problem_solved text not null default '' check (char_length(problem_solved) <= 500),
  add constraint startup_submissions_owner_stripe_account_key unique (owner_id, stripe_account_id),
  add constraint startup_submissions_website_or_stripe check (website_url is not null or stripe_account_id is not null);

grant insert (stripe_account_id, description, country) on public.startup_submissions to authenticated;
grant update (stripe_account_id, name, website_url, description, country, x_handle, mobile_app,
  funding, team_size, founded_on, profit_margin_pct, markets, tech_stack, marketing_channels,
  value_proposition, problem_solved) on public.startup_submissions to authenticated;

create policy "Founders edit their drafts" on public.startup_submissions
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

commit;
