# 01 — Project overview

Audit date: 2026-11-25 · Commit audited: `72ae4f3` (branch `feat/verifiedDB_ik`, clean working tree) · Auditor scope: read-only.

## What the product is

VerifedDB is a two-sided listing and discovery site for small internet businesses. Founders import revenue from Stripe or RevenueCat, publish a listing with an asking price, and talk to buyers in an inbox. Buyers browse, save listings, message sellers, and send acquisition inquiries. The platform takes no part in payment, escrow, legal, or ownership transfer. Revenue is monetised through paid sponsor slots billed with Stripe Checkout.

## Stack and versions (from `package.json` and lockfile)

| Area | Choice |
|---|---|
| Framework | Next.js 16.4.6, App Router, Turbopack dev/build, React 19.3.0 |
| Language | TypeScript 5.9 (`strict: true`) |
| Data / auth | Supabase (`@supabase/ssr` 0.12.7, `@supabase/supabase-js` 2.118.0), PostgreSQL via PostgREST |
| Auth method | Google OAuth only (PKCE through `@supabase/ssr`), httpOnly session cookies |
| Storage | 4 Supabase buckets: `startup-draft-logos` (private), `profile-pictures`, `listing-logos`, `sponsor-logos` (public) |
| Realtime | Not used (inbox polls with `router.refresh()` every 15 s) |
| External APIs | Stripe REST (founder restricted keys + platform billing), RevenueCat v2, Apple iTunes lookup |
| Styling | Global CSS (`globals.css` ~870 lines + `theme.css` override layer) and two CSS modules |
| Tests | `node --test` (10 unit tests) + a manual SQL permission suite `tests/marketplace.sql` |
| Deploy | Vercel (`verified-database.vercel.app`), no `vercel.json`, no CI workflow |

Runtime dependencies are minimal (5). `npm audit`: **0 vulnerabilities** (run 2026-11-25). `npm outdated`: only patch/minor drift (React 19.3.1, supabase-js 2.119.2).

## Directory map

```
src/
  app/                      Routes (App Router)
    page.tsx                Home (server) → components/Home.tsx (client)
    acquire/page.tsx        Marketplace (server) → components/AcquireMarketplace.tsx (client)
    acquire/[id]/page.tsx   Listing detail (server) + error.tsx
    startup/[id]/page.tsx   Owner-only private startup preview
    dashboard/page.tsx      Buyer/seller workspace (server, many inline queries)
    login/, auth/callback/  Google OAuth start + PKCE code exchange
    advertise/              Sponsorship checkout & card editor
    api/stripe/sponsorship/ Stripe webhook (Route Handler)
    *actions.ts             Server Actions (catalog, dashboard, buyer, seller, publish, advertise, login)
    globals.css, theme.css, fonts.ts, layout.tsx
  components/               26 components (client + server)
  lib/                      Domain helpers: catalog queries, provider import, metrics, billing, links, logos
  data/                     Demo/sample data (homepage.json 32 KB, acquire.ts, acquire-founders.json, sponsors.json, providers.json)
  proxy.ts                  Next 16 "proxy" (middleware): refreshes Supabase session cookies
supabase/migrations/        10 SQL migrations (schema, RLS, functions, views, buckets, seed rows)
tests/                      3 unit test files + marketplace.sql
public/assets/              144 files, 3.9 MB (copied reference images, logos)
```

## How modules communicate

```
Browser ──(RSC render / Server Action POST)──► Next.js server
  Server Components ──► lib/catalog.ts, inline queries ──► Supabase (user JWT, RLS)
  Server Actions    ──► Supabase RPC (SECURITY DEFINER functions with auth.uid() checks)
  publish-actions   ──► Stripe/RevenueCat (founder key, once) ──► service-role RPC publish_startup_listing
  advertise/actions ──► Stripe API (platform key) ──► service-role writes to sponsorships
Stripe ──(webhook)──► /api/stripe/sponsorship ──► re-fetch object from Stripe ──► service-role update
```

Business rules that matter (leads, inquiries, saves, publication) live in PostgreSQL functions guarded by `auth.uid()` and advisory locks. This is the strongest part of the design.

## Technical assessment (summary)

Strengths
- Database-first authorization: tables revoke all privileges from `anon`/`authenticated`, then grant column-level privileges and RLS policies. Anonymous probes confirmed this works (see 09).
- Publication can't be forged from the browser: revenue is re-fetched from the provider on the server and written through a service-role-only function.
- Stripe webhook verifies signatures with a timing-safe compare and a 5-minute tolerance, then re-reads the object from Stripe.
- Server Actions validate inputs; redirects use an allow-list (`loginDestination`); outbound fetches go only to fixed hosts with `redirect: "error"`.

Weaknesses (details in later reports)
- Several advertised features are unreachable or have no backing process (anonymity, founder updates, listing review, notifications, account deletion).
- Copied third-party content (testimonial, sponsor brands, TrustMRR data, real founders' names and photos) is still shipped.
- No data access layer, no generated DB types, duplicated helpers, client-heavy pages, no logging/monitoring, no CI.
- Missing security headers, rate limiting, SEO basics, loading/error/not-found routes.

Duplicate / dead code found: `saveStartup` action (never called), `sponsors.json`, `providers.json`, `homepage.json` `images`/`font` maps, `sale_listings.views/offers` (never written), `startup_submissions.addon_interests` (never written by UI), legacy CSS selectors (`.seller-inbox-content`, `.seller-select-thread`, founder-post styles kept for demo-only section). A stray `.idea/` folder contains Dart/Flutter run configurations unrelated to this project.

## What could not be verified

- Live database contents beyond what the anonymous role can see (the public views returned no rows; categories and 10 seeded sponsor cards exist).
- Supabase Auth dashboard settings (MFA, email confirmation, rate limits, redirect allow-list), Vercel environment variables, and whether every migration is applied in production (no service-level SQL access was used).
- Signed-in flows against the real database (no test accounts; creating them would write data).
