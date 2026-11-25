# 16 — Final audit summary

**Application:** VerifedDB · **Commit:** `72ae4f3` · **Date:** 2026-11-25 · **Mode:** read-only (no application code, schema, data or configuration changed).

## Overall verdict

The engineering core is sound. Authorization lives in PostgreSQL with column grants, RLS and narrow SECURITY DEFINER functions; publishing re-verifies revenue on the server; the Stripe webhook is correctly verified; secrets never reach the browser. Anonymous probes against the live API were all correctly denied. **No P0 issues were found.**

The biggest risks are product honesty and completeness rather than code security: copied and fabricated content is still shipped, several features shown in the UI don't exist or have no backend, and the leaderboard's numbers can only come from for-sale startups and never refresh. Hardening (headers, rate limiting, logging), tests in CI and scalability of the marketplace query are the next tier.

## Counts

| Severity | Count | IDs |
|---|---|---|
| P0 Critical | 0 | — |
| P1 High | 5 | F-01, F-02, F-03, F-04, F-05 |
| P2 Medium | 15 | F-06 – F-20 |
| P3 Low | 16 | F-21 – F-36 |
| P4 Informational | 5 | F-37 – F-41 |

By type: confirmed functional bugs 12 · confirmed security weaknesses 2 (F-06 missing headers/clickjacking, F-21 owner-writable metrics) · potential vulnerabilities 4 (F-07, F-26, F-27, F-36) · legal/content 2 · architecture 8 · performance 5 · UX/accessibility 7 · optional 3.

## Top 10 actions
1. Remove the fabricated testimonial (F-01).
2. Remove unpaid seed sponsors and copied third-party data/photos from code, DB and bundle (F-02).
3. Fix the false claims ("Stay anonymous", "Updated live") or ship the features (F-03, F-04).
4. Remove the misleading guest lock overlay (F-05).
5. Add security headers incl. `frame-ancestors 'none'` and disable `x-powered-by` (F-06).
6. Add per-user rate limits for messages, inquiries and imports (F-07).
7. Implement notification emails and account deletion, or hide those settings (F-09, F-08).
8. Add logging/monitoring and CI running type check, lint, unit tests and the SQL permission suite (F-18, F-19).
9. Cache the Stripe price and move marketplace filtering/pagination to the database (F-14, F-15).
10. Fix `--ink-3` contrast and add loading/404 routes (F-16, F-17).

## Issues introduced by the recent redesign (this session's own work)
- Inaccurate marketing copy: "Stay anonymous if you want", "Stay anonymous until you choose to share", "Updated live" (F-03, F-04).
- Low-contrast `--ink-3` text token (F-16).
- `aria-pressed` on a link in the inbox filter (F-31).
- CSS override layering (`theme.css` over legacy `globals.css`) that adds specificity debt (F-23).

## What was verified vs not

Executed: `npm audit`, `npm outdated`, `tsc`, `eslint`, unit tests (10/10 pass), production build, TTFB measurements, browser checks (desktop + 375 px), automated DOM accessibility checks, contrast calculations, anonymous PostgREST/RPC/storage/GraphQL probes, production header checks, git-history secret scan, client-bundle content scan.

Not executed, with reasons:
- `tests/marketplace.sql`: needs a disposable local Supabase; running it against the linked project would write data.
- Authenticated cross-user RLS tests on the live DB: need test accounts and writes.
- Query plans (`EXPLAIN`): no SQL session opened; DB currently empty, so plans wouldn't be representative.
- Lighthouse / LCP: tool unavailable; nothing was installed.
- Supabase Auth and Vercel dashboard settings: no access.
- Production parity of migrations: not checked.

## Report index
01 project overview · 02 business logic · 03 architecture · 04 user flows · 05 functionality matrix · 06 schema · 07 DB optimisation · 08 security · 09 RLS · 10 backend/API · 11 UI/UX · 12 performance · 13 testing · 14 SEO · 15 prioritised roadmap (full finding details) · 16 this summary.

## Status update — P1 fixes (2026-11-25)

| ID | Status | What changed |
|---|---|---|
| F-01 | Fixed in code | Testimonial and photo removed; modal shows an accurate "what happens next" list. |
| F-02 | Fixed in code; migration pending | Seed sponsor cards hidden in code (`publishedSponsorCards`) and deleted by the new migration; copied demo data, TrustMRR posts and 142 unused/copied assets deleted (only the Stripe and RevenueCat logos remain); fictional, server-only sample data replaces them (no longer in the browser bundle). |
| F-03 | Fixed; needs migration | "List anonymously" setting in startup details; column grant in the new migration. |
| F-04 | Partly fixed; needs migration | Growth computed month over month; "as of" dates on the leaderboard; "Updated live" removed; misleading MRR warning removed; growth sort hidden when there's no growth data. Leaderboard membership (only for-sale startups) and scheduled refresh remain product decisions. |
| F-05 | Fixed in code | Fake locked overlay replaced with an honest sign-up prompt; founders section of copied posts removed. |
| F-22 | Fixed (same function) | Relisting resets `listed_at`. |

Verified by: `tsc`, `eslint`, unit tests, production build, and both SQL suites (`tests/marketplace.sql`, new `tests/trust-fixes.sql`) on a disposable local Postgres 16 with all 11 migrations applied.

## Status update — quick wins (2026-11-25)

| ID | Status | What changed |
|---|---|---|
| F-06 | Fixed | CSP (`frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, restricted `form-action`), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`; `X-Powered-By` removed. Scripts still allow `'unsafe-inline'` (a nonce-based CSP is a later step). |
| F-16 | Fixed | `--ink-3` darkened to `#6b675e` (4.6–5.6:1 on every background it's used on). |
| F-31 | Fixed | Inbox filter uses `aria-current` instead of `aria-pressed`. |
| F-13 | Fixed; needs migration | `20261125000100_withdrawal_notice.sql` posts a message to each affected buyer's thread; withdraw button now asks for confirmation. |
| F-29 | Fixed | Two-step confirmation on Decline, Close, buyer Withdraw, and Withdraw listing. |
| F-17 | Fixed | Loading skeletons for the marketplace index and dashboard; branded 404, error and global-error pages; missing listings return HTTP 404; signed-out `/dashboard` and `/startup/*` redirect (307) in the proxy before rendering. |
| F-14 | Fixed | Stripe price (1 h), categories (1 day) and sponsor catalog (5 min, invalidated on changes) cached; home data loads in one parallel round. Local TTFB/total: home ≈0.52 s → 0.17–0.27 s, marketplace ≈0.51 s → 0.16 s, advertise 0.32 s → 0.01 s. |
| F-20 | Mostly fixed | `robots.txt`, `sitemap.xml` (public listings), per-listing titles/descriptions/canonicals, Open Graph/Twitter tags, `noindex` on dashboard/login/404, accurate `llms.txt`. Structured data and OG images remain. |

## Status update — abuse limits, deletion, logging, CI (2026-11-25)

| ID | Status | What changed |
|---|---|---|
| F-07 | Fixed; needs migration | `20261125000200_rate_limits.sql`: per-user limits in SQL for messages, contacts, saves and provider imports/verifications. |
| F-10 | Fixed; needs migration | `20261125000300_startup_deletion.sql` + dashboard controls: delete startup (blocked while listed), disconnect provider. |
| F-18 | Fixed | Structured JSON error logging (`src/lib/log.ts`) across actions, webhook, auth and provider imports. |
| F-19 | Fixed | GitHub Actions CI with app checks and a Postgres job running all migrations and three SQL suites. |

Live database (2026-11-25): migrations through `20261125000100` applied; `20261117000000` recorded as previously hand-applied; `20261117000001_sponsor_logos` (never applied before) applied.

## Status update — scalability, buyer context, realtime, cleanup, SEO (2026-11-25)

| ID | Status | What changed |
|---|---|---|
| F-15 | Fixed | Marketplace filters/sort/pagination in the database via URL parameters; buyer dashboard loads only saved listings and three suggestions. |
| F-28 | Fixed; needs migration | `seller_lead_buyers` view + "About the buyer" card in the seller inbox. |
| F-30 | Fixed; needs migration | Inbox updates over Supabase Realtime (RLS-filtered); 60 s fallback. CSP `connect-src` now allows the project's Supabase origin. Trade-off: the page receives a short-lived access token for the socket. |
| F-24 | Partly fixed | Generated `Database` types on all clients; shared admin client; `sqlNullable` for NULL RPC args. A full data-access layer is still optional. |
| F-23 | Fixed | Dead actions (`saveStartup`, listing-review request), 51 unused CSS selectors and the `.idea/` IDE files removed. |
| F-26 | Fixed | `server-only` on Supabase server/admin/public clients, catalog, billing, provider import, logging, rate limiting and sample data. |
| F-20 | Fixed | JSON-LD on home and listings; generated Open Graph images (site and per listing); `summary_large_image` cards. |
