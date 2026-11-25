# 02 — Business logic and data flow audit

Finding IDs (F-xx) are defined in full in `15-prioritized-improvement-roadmap.md`.

## Feature traces

### 1. Add a startup (import revenue)
- Purpose: create a private draft from a payment provider. Users: signed-in founders.
- Input: provider, API key (`rk_live_…` for Stripe, `sk_…` v2 for RevenueCat), optional RevenueCat project ID, optional X handle.
- Validation: key format regex, handle regex, project ID regex (`dashboard/actions.ts → importStartupSource`).
- Processing: `lib/provider-import.ts` reads the account profile, up to 50×100 charges and active subscriptions (Stripe) or overview/charts/apps (RevenueCat). Metrics are aggregated per currency.
- Storage: RPC `save_startup_payment_source` / `save_revenuecat_app_profile` (security invoker, advisory lock per owner+provider+account) → `startup_submissions` + `startup_payment_sources.metrics` (jsonb).
- Success: redirect to `/dashboard?startup=<id>`. Failure: generic messages per error code.
- Issues: keys are used once and not stored (good). Import can take tens of seconds (35 s abort) and has no rate limit (F-07, F-41). Stripe revenue = captured minus refunded, gross of fees, includes one-time charges (F-39).

```
Founder ─► AddStartupModal ─► importStartupSource ─► Stripe/RevenueCat API
                                   └─► rpc save_startup_payment_source ─► startup_submissions, startup_payment_sources
```

### 2. Edit startup details / logo
- `updateStartupDetails` validates every field (lengths, URLs, enums, tags) and updates by `id` + `owner_id`; DB check constraints back it up. Logo: client resizes to PNG ≤384 px; server checks PNG magic bytes and dimensions; storage RLS ties the object path to an owned draft.
- Gap: the `anonymous` flag can't be changed (no column grant, no UI) — F-03. No way to delete a draft or disconnect a provider — F-10.

### 3. Publish / withdraw a listing
- `publishListing` (Server Action): re-validates the user with `auth.getUser()`, loads draft + selected source, requires website and description, **re-fetches** provider metrics with a fresh key, checks the provider account ID matches, computes a 30-day USD snapshot (`listingSnapshot`), copies the logo to a public bucket, and calls service-role-only `publish_startup_listing`.
- `publish_startup_listing` upserts `startups`, writes one `revenue_snapshots` row per day, inserts or reactivates the `sale_listings` row (`public_preview = true`).
- Withdraw: `withdraw_startup_listing` sets status `withdrawn` and flips open/accepted inquiries to `declined`.
- Issues:
  - Republishing keeps the original `listed_at` (`coalesce(listed_at, now())`), so "Recently listed", "Listed in last N days", and "Best deals this week" ignore relistings — F-22.
  - `revenue_growth_pct` / `mrr_growth_pct` are always set to `null` and `includes_nonrecurring` always `true` — growth columns and the leaderboard growth sort can never show data — F-04.
  - Withdrawal declines buyers' inquiries without posting a message to their threads (contrast with `update_acquisition`, which does) — F-13.
  - A logo uploaded before a failing RPC is left orphaned in `listing-logos` (minor).

### 4. Leaderboard ("database of verified startup revenues")
- `leaderboard` view = published `startups` with a latest snapshot that has `mrr_cents`.
- `startups` rows are created **only** by `publish_startup_listing`. A founder who imports revenue but doesn't list for sale never appears. Withdrawn or sold startups keep their last snapshot forever and are never refreshed — F-04.
- The home "Market snapshot" card (added in the recent redesign) says "Updated live", which is inaccurate given the above.

### 5. Marketplace browsing
- `marketplace` view filters active, listed, published rows; guests see only `public_preview` rows. Every publish sets `public_preview = true`, so guests see everything. The UI still renders a lock overlay with fabricated listing names ("Get Founders", "Figmentor") to guests — F-05.
- Filtering/sorting happens in the browser over the full catalog, fetched in 250-row pages on every request — F-15.

### 6. Save, contact, inquire (buyer)
- `set_saved_listing`, `contact_listing`, `send_buyer_message`, `update_acquisition` are SECURITY DEFINER functions that take identity from `auth.uid()`, lock per buyer+listing, and never trust client-supplied seller IDs or names. A buyer profile is required (`P0003`).
- Status machine (`update_acquisition`):

```
none ──contact(inquiry)──► open ──seller──► accepted ──seller──► completed (listing → sold, competing inquiries → declined)
                             │                 │
                             ├─seller──► declined ◄──seller──┘
                             └─buyer───► withdrawn ◄──buyer── accepted
declined / withdrawn ──contact(inquiry)──► open   (re-inquiry allowed)
```

- Correct: transitions are enforced in SQL, listing rows are locked first to avoid races, completion is atomic.
- Issues: no rate limit on messages/inquiries (F-07); no confirmation for seller "Decline"/"Close inquiry" (F-29); sellers can't see the buyer's profile (bio, budget) — only a name (F-28); `completed` is a self-declaration by the seller only (the buyer can't confirm) — acceptable given the "meeting place" positioning, but worth stating in UI copy.

### 7. Seller inbox and interested buyers
- `seller_leads` (RLS: seller or buyer) + `seller_lead_messages` (RLS through lead visibility). Trigger maintains `last_message_at/last_sender`.
- "Interested buyers" = leads with no messages yet (created by saves). Unsaving deletes untouched leads.
- The inbox refreshes by re-rendering the whole dashboard every 15 s (F-30). No email notification on new messages (F-09).

### 8. Sponsorships
- `reserve_sponsorship` (service role) takes a global advisory lock, expires stale reservations, assigns a free slot (1–20), 35-minute hold. Checkout session ID is saved before the URL is handed out; idempotency key = reservation ID. Webhook re-reads Checkout/Subscription from Stripe and only moves state forward (`stripe_event_at`).
- `sponsorship_catalog` counts seed rows as occupied slots. Ten seed rows advertise real third-party companies that haven't paid (live in production; confirmed via anonymous RPC) — F-02.
- Paused sponsorships keep their slot but are hidden (reasonable). Ended sponsorships leave logo files in storage (minor).

### 9. Profiles, settings, feedback, account
- Seller profile (`profiles`) and buyer profile (`buyer_profiles`) are separate entities with separate names, bios and notification flags. This is intentional but duplicative and confusing for users who are both (U-10 in the UI/UX report).
- Account deletion only sets `deletion_requested_at`; nothing processes it — F-08.
- Feedback: 10 messages per role, enforced with advisory lock + slot PK (good).

### 10. Founder updates feed
- `activity_posts` has no insert grant or policy for users and no UI — only the service role can create posts. The home "Building in public" section is permanently empty in production — F-11.

## Ambiguities needing a product decision
1. Should the leaderboard include founders who verified revenue but are **not** selling? (Current schema says no; home copy implies yes.)
2. Should guests see all listings (current DB behaviour) or a subset (current UI behaviour)?
3. Is anonymity a supported feature? If yes, it needs a setting and identity redaction on the listing page (the views already redact).
4. Who reviews "listing review" requests, and who moderates listings and messages?
5. Should revenue snapshots refresh on a schedule (requires stored provider access, e.g. Stripe Connect) or only on republish?
