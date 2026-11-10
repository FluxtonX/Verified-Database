alter table public.startup_submissions
  drop constraint startup_submissions_provider_check,
  add constraint startup_submissions_provider_check check (provider in ('stripe', 'revenuecat'));
