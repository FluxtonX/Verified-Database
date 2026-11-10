# VerifedDB

VerifedDB has a public startup leaderboard, an acquisition marketplace, and passwordless sign-in. The existing page layouts also run with sample data when the Supabase environment variables are unset.

## Run locally

```sh
npm install
npm run dev
```

Open http://localhost:3000. Use Node.js 22 or later.

## Connect Supabase

1. Copy `.env.example` to `.env.local`. Set the Supabase Project URL and **publishable key** from the project’s Connect dialog. Set `APP_URL` to the origin people use to open VerifedDB. The web app uses the publishable key and the signed-in user's session.
2. For a fresh project, run the migration once in the Supabase SQL Editor. For a tracked CLI deployment, sign in with `supabase login`, link the project with `supabase link --project-ref <project-ref>`, inspect `supabase db push --remote --dry-run`, and run `supabase db push --remote` with project database access. Use one route to apply the migration. [Database migrations](https://supabase.com/docs/guides/local-development/database-migrations)
3. Set the Supabase Auth Site URL. Add the app’s exact callback URL to the redirect allowlist, such as `http://localhost:3000/auth/callback` for local testing. In Google Cloud, register the **Supabase Auth callback URL** shown in the Google provider settings. Enable Google in Supabase and enter the Google OAuth credentials there. [Google sign-in](https://supabase.com/docs/guides/auth/social-sign-in/auth-google) · [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
4. Restart Next.js. Add a real startup, revenue snapshot and active sale listing through an operator account to exercise the catalog. A fresh database starts with categories and an empty catalog. The repository’s reference fixtures are for local preview.

## Model and rollout plan

TrustMRR uses a public revenue leaderboard and acquisition cards that show 30-day revenue, asking price, and a multiple. VerifedDB models those as separate records so a startup can appear on the leaderboard before being listed for sale. It also separates verified revenue from seller-reported profit margin. [TrustMRR home](https://trustmrr.com/) · [TrustMRR marketplace](https://trustmrr.com/acquire) · [TrustMRR product notes](https://trustmrr.com/llms.txt)

| Model | Fields and behavior |
| --- | --- |
| Accounts and profiles | Supabase Auth owns identity, email and sessions. Profiles hold display name, avatar, and X handle for publication. |
| Startup submissions | Private founder-owned drafts store website, name, category, preferred provider, X handle, anonymity, intent to sell, and optional add-on interests. A founder can save one draft per normalized URL. |
| Startups and categories | Public identity, description, website, logo, category, founding date, country, audience, mobile-app status, anonymity, and publication date. |
| Revenue snapshots | One verified USD measurement per startup and date. Store trailing 30-day revenue and MRR in integer cents, their separate growth percentages, a non-recurring revenue flag, and source and verification timestamps. |
| Sale listings | Listing status, USD asking and previous price, self-reported profit margin, listing date, featured and preview flags, and aggregate views and offers. The multiple is asking price divided by 12 times trailing 30-day revenue. Zero revenue produces an empty multiple. |
| Activity | Published founder updates and account-scoped likes. Anonymous startups are excluded from the feed to protect their identity. |

1. **Current screens.** Home reads the top 100 published leaderboard entries, recent listings, best deals, and the latest six updates. Acquire reads the listings visible to the current account, with price, revenue, dates, audience and other filters. The database grants guest access only to listings marked for preview. Published projections redact anonymous company identity. Login supports Google sign-in and resumes the original startup submission flow after sign-in. [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs) · [Row level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
2. **Live acceptance.** After applying the migration, test the Google callback, sign-out, a guest versus a member’s marketplace results, saving a private draft from both entry points, and like persistence. Check draft isolation with two accounts. Live filters currently run over the listings fetched for the visible catalog. Move filtering, sorting and pagination into database queries as volume grows.
3. **Verification and publishing.** Add Stripe authorization, server-side credential storage, source deduplication, a retryable sync job, and a review/publish workflow. Define refund handling, currency normalization and the recurring-revenue calculation before marking data verified. Founder submissions currently save drafts. Paid add-ons, buyer offers and messaging, and founder dashboard workflows belong to later phases.

## Sponsorship checkout

Apply the sponsorship migration to load the starter cards and inventory. Set `SUPABASE_SECRET_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_SPONSOR_PRICE_ID`, and `STRIPE_SPONSOR_WEBHOOK_SECRET` on the server. Set the ID of an active, fixed-price USD Price that bills every month. The app displays the amount returned by Stripe. Enable subscription cancellation in the Stripe customer portal.

Register `/api/stripe/sponsorship` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, and `customer.subscription.resumed`. Use Stripe test credentials and a separate Supabase project or local database to exercise checkout without publishing test sponsors to the live site.
