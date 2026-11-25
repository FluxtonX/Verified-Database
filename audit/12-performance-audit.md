# 12 — Performance and scalability audit

Measured values are marked **(measured)**; everything else is analysis. Lighthouse wasn't available in this environment, and nothing was installed to get it.

## Measurements (local production build `next start`, macOS, real Supabase + Stripe over the internet, 2026-11-25)

| Route | TTFB via curl (3 runs) | Notes |
|---|---|---|
| `/` | 1.35 s (cold), 0.52 s, 0.57 s **(measured)** | auth claims → categories → 4 catalog queries + sponsor RPC + **Stripe price API** |
| `/acquire` | 0.51 s, 0.54 s, 0.50 s **(measured)** | full catalog loop + 4 queries + Stripe price |
| `/advertise` | 0.34 s, 0.32 s, 0.32 s **(measured)** | sponsorship lookups + Stripe price |
| `/login` | 0.014 s, 0.018 s, 0.011 s **(measured)** | no network calls |

Browser (in-app Chromium, 1440×900, home page) **(measured)**: TTFB 846 ms, DOMContentLoaded 895 ms, 8 JS files / 157 KB transferred, CLS 0. LCP couldn't be read (the observer returned no entry in this browser); not reported.

Build output **(measured)**: `.next/static/chunks` = 936 KB raw; largest chunks gzip to 72 KB, 46 KB, 39 KB. `public/assets` = 3.9 MB, including a 2.1 MB `reference-106.webp` that the current UI never displays.

Production site (`verified-database.vercel.app`) runs older code and wasn't benchmarked.

## Findings

| ID | Area | Issue | Evidence | Impact | Fix |
|---|---|---|---|---|---|
| F-14 | Backend | Uncached Stripe `GET /v1/prices/:id` and categories on every home/marketplace/advertise render; two sequential network rounds before render (`catalogContext` then data). | `app/page.tsx`, `acquire/page.tsx`, `sponsor-billing.ts`; TTFB 0.5 s vs 0.015 s for a page with no calls. The share attributable to Stripe alone wasn't isolated. | Slower TTFB, Stripe rate-limit exposure, page fails soft if Stripe is slow (12 s timeout). | Cache price 1 h (`use cache`/`unstable_cache`, tag `sponsor-price`); cache categories; fetch claims and data in parallel. |
| F-15 | Backend/DB | Marketplace and buyer overview fetch the entire catalog in 250-row pages and filter in the browser. | `lib/catalog.ts → readMarketplace`, `BuyerDashboard.tsx`. | O(n) server time, RSC payload and client memory as listings grow. | Server-side filters + keyset pagination; `limit 3` for recommendations. |
| F-25 | Frontend | Home and marketplace are fully client components; demo JSON (32 KB raw, incl. third-party names) and demo listings ship to every visitor even in production. | `"use client"` in `Home.tsx`, `AcquireMarketplace.tsx`; demo names found in `.next/static/chunks/*.js`. | Extra JS parse/hydration; privacy issue (F-02). | Server-render static parts; import demo data only in development (or delete it). |
| F-30 | Backend | Inbox polls with `router.refresh()` every 15 s → full dashboard re-render (2–3 queries) per open tab. | `InboxRefresh.tsx`. | Load scales with idle open tabs. | Supabase Realtime on `seller_lead_messages` (RLS-aware) or a lightweight `messages since` endpoint. |
| F-23 | Assets | 2.1 MB unused image + many unused reference images in `public/assets`. | `du`. | Repo/deploy size only (not loaded by pages). | Delete unused assets. |
| — | Fonts | Three self-hosted families via `next/font` with `display: swap`. | `fonts.ts`. | Small; CLS 0 measured. | Optionally drop Instrument Serif normal style (only italic used). |
| — | Images | `<img>` used instead of `next/image` for logos/avatars (lint rule disabled per file). | components. | Small, mostly 24–48 px images from Supabase/CDNs; no lazy issues on home. | Acceptable; consider `next/image` with remote patterns for listing logos. |

## Database scalability
See `07-database-optimization.md`: computed `multiple` and per-row lateral snapshot lookups prevent index use for "best deals" and the leaderboard; recommended indexes and a stored latest-snapshot/multiple column.

## Prioritised optimisation plan
1. Cache Stripe price and categories; parallelise auth + data fetches (small change, largest TTFB win).
2. Server-side marketplace filtering + pagination; targeted recommendations query.
3. Move static rendering of Home/Marketplace to the server; stop shipping demo data.
4. Replace inbox polling with Realtime.
5. Add the indexes from report 07 when listings exceed a few thousand.
