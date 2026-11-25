# 03 — Architecture audit

## Rendering model

| Route | Server work | Client work | Assessment |
|---|---|---|---|
| `/` | `catalogContext` (auth claims + categories) → `readHome` (4 queries) + sponsor catalog RPC + **Stripe price API** | Entire page incl. leaderboard table, listings, feed, stats (`Home.tsx` is `"use client"`) | Most markup could render on the server; only search, sort toggles, likes and the add-startup modal need client islands. Demo JSON (32 KB, real names) is bundled into the client chunk even when Supabase is configured (confirmed in `.next/static/chunks`). |
| `/acquire` | full catalog fetch (250-row loop) + saves + buyer profile + publications + sponsors + Stripe price | All filtering/sorting client-side; demo listings and copied founder posts bundled | Doesn't scale; move filters to query params and database queries (F-15). |
| `/acquire/[id]` | 1–3 queries | Save/contact forms | Good split. Static `metadata` (no per-listing title/OG). Unavailable listing returns HTTP 200 (soft 404). |
| `/dashboard` | 1–6 queries per tab, inline in `page.tsx` and `BuyerDashboard.tsx` | Forms | Data access mixed into route/component files; no `loading.tsx`. |
| `/startup/[id]` | owner-only query + signed URL | Revenue chart | Good; `noindex` set. |
| Webhook | Node runtime, signature verification | — | Good. |

All routes are dynamic (`ƒ`). No `use cache`, `unstable_cache`, or `revalidate` is used; `revalidatePath` calls are therefore no-ops in practice. That is acceptable for per-user pages, but public catalog reads and the Stripe price lookup run on every request (F-14).

Next 16 `proxy.ts` refreshes the session on matched routes (`/`, `/acquire/*`, `/advertise`, `/login`, `/dashboard`, `/startup/*`). Fine.

Route-level files present: only `acquire/[id]/error.tsx`. Missing: root `error.tsx`, `global-error.tsx`, `not-found.tsx`, `loading.tsx` for dashboard and marketplace (F-17).

## Backend layering

```
UI components ── call ──► Server Actions (*actions.ts) ── Supabase client (user JWT) ──► RPC / tables
Server pages  ── inline queries ──────────────────────────────────────────────────────► views / tables
lib/*          ── domain helpers (pure) + some data access (catalog.ts, sponsor-billing.ts)
PostgreSQL     ── authorization + business rules (SECURITY DEFINER functions, RLS, constraints)
```

What works: the database is the real authorization and business-rule layer. Server Actions validate input, then call narrowly scoped RPCs. This is a coherent "thin server, smart database" design and shouldn't be replaced.

What's missing:
- **No data access layer.** Queries live in `dashboard/page.tsx` (173 lines), `BuyerDashboard.tsx`, `acquire/[id]/page.tsx`, `lib/catalog.ts`, `sponsor-billing.ts`. Column lists and row types are re-declared by hand. A small `src/server/data/*` module per domain (catalog, leads, startups, sponsorships) returning typed DTOs would remove duplication without adding a framework.
- **No generated database types.** Every query uses `.returns<T>()` with hand-written types (`MarketplaceRow`, `LeaderboardRow`, `SellerLead`, …). Schema changes can silently break pages. Use `supabase gen types typescript` and `createServerClient<Database>()`.
- **Duplicated helpers.** `account()` exists in three action files; the UUID regex is copied in at least six places (`isUuid`, `isId`, inline regexes in `actions.ts`, `startup/[id]`, `SellerInbox`'s thread lookup); money formatting exists in `catalog.ts`, `format.ts`, `currencyAmount`.
- **Secret-reading modules lack a `server-only` guard** (`sponsor-billing.ts`, the inline `createClient(url, secret)` in `publish-actions.ts`). Today they're only imported server-side (verified), but nothing prevents a future client import (F-26).
- **Error handling swallows causes.** Nearly every `catch {}` and `if (error)` returns a friendly string and drops the underlying error; nothing is logged. Production debugging will be guesswork (F-18).
- **No background processing.** Revenue refresh, notification emails, deletion processing and orphaned-file cleanup all need a job runner (Supabase cron/Edge Functions or Vercel Cron) — none exists.
- **Long-running work in a request.** Provider imports page through up to 5,000 charges inside a Server Action with a 35 s abort. On serverless hosts with shorter limits this fails mid-way (F-41).

## Styling architecture

`globals.css` (legacy, ~870 lines with many single-line rules and `@media` blocks) plus `theme.css` (new design layer that overrides legacy selectors by load order) plus `Home.module.css`, `Site.module.css`, `SponsorPanel.module.css`. The override-by-order approach (introduced in the recent redesign) works but creates specificity debt: some legacy selectors are more specific than the theme (`.workspace-page h2` beat `.workspace-eyebrow` and needed a patch). Recommend folding `theme.css` into the components it styles (CSS modules) and deleting the superseded legacy rules (F-23).

## Scalability notes

- Catalog reads are O(all listings) per request (F-15); leaderboard view does a lateral subquery per startup (fine to ~10k rows, then materialise).
- Inbox polling re-renders the whole dashboard every 15 s per open tab (F-30).
- Advisory locks are per user/listing, so contention is low. `reserve_sponsorship` uses a single global lock (fine for 20 slots).

## Recommendations (no unnecessary architecture)
1. Add `src/server/` with `import "server-only"`, a typed Supabase factory, and per-domain query functions returning DTOs.
2. Generate DB types and wire them into both Supabase clients.
3. Cache public reads (`use cache` / `unstable_cache` with tags) and the Stripe price (1 h TTL); invalidate with `revalidateTag` from publish/withdraw/sponsor actions.
4. Convert `Home` and `AcquireMarketplace` to server components with small client islands; move marketplace filters to URL params handled by SQL.
5. Add structured logging (e.g. `console.error` with a request ID at minimum; Sentry or Vercel observability ideally).
6. Introduce a scheduled job layer for refresh, notifications, deletion and cleanup.
