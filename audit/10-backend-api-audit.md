# 10 — Backend and API audit

## Inventory

| Kind | Name | Auth | Input validation | Authorization | Notes |
|---|---|---|---|---|---|
| Route Handler | `POST /api/stripe/sponsorship` | Stripe signature (HMAC-SHA256, 300 s tolerance, timing-safe) | event shape | re-fetches objects from Stripe; updates only matching session/subscription | ✅ Returns 500 on reconcile errors so Stripe retries; nothing is logged (F-18). |
| Route Handler | `GET /auth/callback` | PKCE code | `loginDestination` allow-list | — | ✅ `Cache-Control: private, no-store`. |
| Server Action | `loginWithGoogle`, `signOut` | — | destination allow-list | — | ✅ |
| Server Action | `importStartupSource` | `getClaims` | key/handle/project regex, target UUID + ownership | RPC + RLS | ⚠️ long-running, no rate limit (F-07, F-41) |
| Server Action | `updateStartupDetails`, `uploadStartupLogo` | `getClaims` | thorough | `eq owner_id` + RLS + storage policy | ✅ |
| Server Action | `publishListing` | `getUser` | price cents, UUIDs, key | ownership check, provider account match, service-role RPC | ✅ |
| Server Action | `withdrawListing` | `getClaims` | UUID | definer function owner check | ✅ |
| Server Action | seller profile/settings/email/deletion/feedback/message/archive/sale request | `getClaims` | lengths, URL rules, timezone | RLS / RPC | ✅ (deletion and sale request have no backend process: F-08, F-12) |
| Server Action | buyer save/profile/preferences/contact/message/acquisition/feedback | `getClaims` | money cents, categories exist, lengths | RPC | ✅ |
| Server Action | advertise checkout/publish card/billing | `getUser` | price ID match, URLs, file magic bytes | service role with `owner_id` filters | ✅ |
| Server Action | `saveStartup`, `setActivityLike` (`catalog-actions.ts`) | `getClaims` | — | RLS | `saveStartup` is **dead code** (F-23). |

## Cross-cutting observations

**Validation.** Hand-written per action; consistent with DB constraints. No schema library (Zod/Valibot), so rules are duplicated between client attributes, actions and SQL. Acceptable at this size; a shared schema per form would reduce drift.

**Authorization.** Every action re-authenticates; none trusts client-supplied owner IDs. ✅

**Error handling.** Errors are mapped to friendly strings (good UX) but discarded (bad ops). Example: `publishListing` returns "Check that the marketplace migration is applied" for *any* RPC error, which can mislead operators. Add `console.error({ action, code: error.code, message: error.message })` at minimum (F-18).

**Idempotency.** Sponsorship checkout uses Stripe idempotency keys; DB writes use `on conflict` and partial unique indexes. Provider import is idempotent per (owner, provider, account). ✅

**Timeouts.** All outbound fetches use `AbortSignal.timeout` (5–35 s). ✅ The 35 s Stripe import can exceed serverless limits on some plans (F-41).

**Request size.** `serverActions.bodySizeLimit: "2mb"` (only logos are uploaded, ≤800 KB). ✅

**Rate limiting / replay.** None at the app layer (F-07). Stripe webhook replay is bounded by the 300 s timestamp window and state-forward updates. ✅

**Sensitive response fields.** Views redact owner IDs and anonymous identities. `seller_leads` exposes `buyer_id` to sellers (low).

**Consistency.** Two return shapes (`{error, message}` vs `{error, saved}`) and three `account()` helpers. Unify on one `ActionResult` and one `requireUser()` helper (F-24).

**External integrations.**
- Stripe founder import: gross captured − refunded charges, all currencies tracked, USD used for publishing; MRR excludes subscriptions with discounts/metered/tiered prices (returns `null`, which is honest).
- RevenueCat: USD charts; falls back to overview MRR.
- Apple lookup: best-effort, 5 s timeout.
- Platform Stripe: price fetched on **every** public page render (F-14).

**Background work.** None; needed for notifications (F-09), deletion (F-08), revenue refresh (F-04), storage cleanup.
