# 13 — Testing and QA audit

## What exists (executed 2026-11-25)

| Suite | Runner | Tests | Result |
|---|---|---|---|
| `tests/marketplace.test.mjs` | `node --test` | 4 (money parsing, redirect allow-lists, 30-day USD snapshot, invalid metrics) | ✅ pass |
| `tests/sponsor-links.test.mjs` | `node --test` | 4 (UTM tagging, affiliate stripping, unsafe URLs) | ✅ pass |
| `tests/sponsor-logo.test.mjs` | `node --test` | 2 (magic bytes, cleanup path) | ✅ pass |
| `tests/marketplace.sql` | `psql` on a disposable DB | ~30 assertions: publication forging, redaction, save idempotency, lead isolation, message spoofing, inquiry transitions, completion, feedback limits | **Not executed** (needs a disposable local Supabase; not run against the linked project to avoid writes) |
| Type check / lint | `tsc`, `eslint` | — | ✅ clean |

No CI configuration exists (no `.github/workflows`), so none of this runs automatically on pushes or pull requests.

## Coverage gaps (by risk)

### Security / authorization (highest value)
- RLS for `startup_submissions`, `startup_payment_sources`, `profiles`, `activity_likes` (cross-user read/write attempts).
- Storage policies: user A uploading to `<userB>/<draft>.png`; anonymous reads of private draft logos.
- `publish_startup_listing` not callable by `authenticated` (currently only verified manually, by the anon probe in report 08).
- Sponsorship: `reserve_sponsorship` slot exhaustion and expiry; webhook state transitions.
- Server Actions with a forged UUID belonging to another user (expect generic failure, no data).

### Unit
- `validStripeSignature` (valid, wrong secret, stale timestamp, multiple `v1=` entries).
- `importStripeSource` / `importRevenueCatSource` parsing with recorded fixtures (zero-decimal currencies, refunds, disputes, discounts → `mrr: null`, pagination limit).
- `startupWebsite`, `storeLink`, `importedLogoUrl`, `isLogoImage`, `compactMoney`, `median`.
- `loginDestination` for every dashboard parameter combination.

### Integration
- Server Actions against a local Supabase (`supabase start`): import → edit → publish (with mocked provider) → save → contact → inquiry → accept → complete → listing sold.
- Webhook route with signed fixture events.

### End-to-end (Playwright, not installed)
1. Visitor: home → marketplace → listing → sign-in prompt.
2. Seller: login (test OAuth or Supabase test user) → add startup (mock provider) → publish → withdraw.
3. Buyer: create profile → save → inquire → withdraw.
4. Seller ↔ buyer conversation and acquisition completion across two browser contexts.
5. Sponsor checkout with Stripe test mode and `stripe trigger`.
6. Mobile viewport smoke tests and axe accessibility scans on each page.

### Regression risks right now
The recent redesign changed markup on every page without visual or E2E tests; the inbox restructure (three-column layout, new classes) and the shared header are the most likely places for regressions.

## Roadmap
1. Add GitHub Actions: `npm ci`, `tsc`, `eslint`, `npm test`, `next build`.
2. Add a CI job that runs `supabase start`, applies migrations and runs `tests/marketplace.sql` plus new RLS/storage tests.
3. Add fixture-based provider and webhook unit tests.
4. Add Playwright with 5–6 critical journeys and `@axe-core/playwright`.
5. Track coverage for `src/lib` (target 80%) rather than the whole app.
