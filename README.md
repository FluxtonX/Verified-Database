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
3. **Verification and publishing.** Sellers import Stripe or RevenueCat accounts into private startup drafts, edit details, and verify a selected provider again to publish. Publication reads fresh USD metrics on the server, matches the provider account to the selected source, and calls a service-role-only transaction. Editable saved draft metrics cannot be used to forge a public revenue snapshot. Provider keys are used once and are not stored. Only the selected source is published; currencies and providers are not combined. Revenue and MRR retain their separate meanings.

## Buyer and seller workspaces

Apply **all** migrations in filename order, including `supabase/migrations/20261117000000_buyer_marketplace.sql`, before using the new workspace. Set `SUPABASE_SECRET_KEY` on the server to enable verified publishing. Existing OAuth and provider imports remain in place.

- `/dashboard?mode=buyer` opens the buyer overview. Buyers create a separate profile, set acquisition criteria, save listings, contact sellers, and track conversations and acquisition inquiries. Profile setup returns to the originating listing.
- `/dashboard?mode=seller` opens the seller workspace. Existing drafts, profile editing, provider imports, private startup previews, feedback, and settings remain available. Sellers publish or withdraw listings and respond to buyer interest in their inbox.
- `/acquire` supports search, filters, sorting, listing details, and persistent saves. `/acquire/[listing-id]` reads a redacted public projection. `/startup/[submission-id]` remains an owner-only preview.
- Saves create interested-buyer leads. Removing an untouched save removes that lead; established conversations are retained. Buyers and sellers share the existing message tables, with participant access enforced in PostgreSQL. Inboxes refresh every 15 seconds while visible and have a manual refresh action.
- Inquiries progress from sent to in discussion, declined, withdrawn, or acquired. Sellers confirm completion after payment and transfer have been arranged separately. Completion removes the listing from discovery and closes competing inquiries. The application does not process acquisition payments or transfer ownership.
- Buyer notification preferences are persisted independently. Email delivery remains pending setup, as with seller notifications. Feedback is limited to ten messages per role.

### Verification

Run `npm test`, `npm run lint`, and `npm run build` with Node.js 22 or later. `tests/marketplace.sql` exercises real PostgreSQL permissions and workflows: profile isolation, anonymous listing redaction, save idempotency, two-way messages, spoofing prevention, inquiry transitions, completion, and feedback limits. Run it only against a disposable local Supabase database after applying all migrations:

```sh
psql "$LOCAL_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/marketplace.sql
```

The SQL test rolls back its fixtures. For release acceptance, use two test accounts to verify OAuth callbacks and connect test provider accounts to exercise fresh-provider publishing. Do not use production credentials or publish test businesses into the live catalog.

## Sponsorship checkout
Apply the sponsorship migration to load the starter cards and inventory. Set `SUPABASE_SECRET_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_SPONSOR_PRICE_ID`, and `STRIPE_SPONSOR_WEBHOOK_SECRET` on the server. Set the ID of an active, fixed-price USD Price that bills every month. The app displays the amount returned by Stripe. Enable subscription cancellation in the Stripe customer portal.

Apply `20261117000001_sponsor_logos.sql` to create the public sponsor logo storage bucket. A sponsor must provide an HTTPS logo URL or upload a PNG, JPG, or WebP file up to 800 KB before publishing or updating a card. Uploaded files are stored in Supabase Storage; the sponsor can replace one with another file or a URL.

Register `/api/stripe/sponsorship` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, and `customer.subscription.resumed`. Use Stripe test credentials and a separate Supabase project or local database to exercise checkout without publishing test sponsors to the live site.

Sponsor cards on home, marketplace, and mobile automatically add `utm_source=verifeddb&utm_medium=referral&utm_campaign=sponsor_card` at render time, so existing catalog records work without a database migration. Old UTM tags are replaced; landing-page paths, fragments, and legitimate partner parameters are preserved. The copied Higgsfield `/marclou` destination and reference `ref=trustmrr` attribution are removed. Use a partner URL issued to VerifedDB if affiliate attribution is required.

Sponsors with GA4 installed can view `verifeddb / referral` under **Reports → Acquisition → Traffic acquisition**, using Session source / medium and Session campaign. Their redirects must preserve the campaign parameters until analytics records the landing. Leads and sales require conversion/key-event tracking on the sponsor's site; URL tags alone do not report those conversions back to VerifedDB. See [Google's campaign URL guide](https://support.google.com/analytics/answer/10917952?hl=en).
