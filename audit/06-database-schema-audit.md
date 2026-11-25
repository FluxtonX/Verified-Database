# 06 — Database schema audit

Source: the 10 files in `supabase/migrations/`. Production parity couldn't be checked (no service-level SQL session was used); treat this as an audit of the intended schema.

## Entity map

```
auth.users ─┬─< profiles (1:1, seller identity)
            ├─< buyer_profiles (1:1, buyer identity)
            ├─< startup_submissions (private drafts) ─< startup_payment_sources (composite FK id+owner)
            │            └──(submission_id, unique)── startups (published) ─< revenue_snapshots (PK startup,date)
            │                                              ├─< sale_listings ─< saved_listings >─ auth.users
            │                                              │                └─< seller_leads ─< seller_lead_messages
            │                                              └─< activity_posts ─< activity_likes >─ auth.users
            ├─< seller_feedback / buyer_feedback (PK owner,slot)
            └─< sponsorships (owner nullable for seeds)
categories (text PK) ◄── startup_submissions.category, startups.category
```

## Table-by-table

| Table | Keys & constraints | Observations |
|---|---|---|
| `profiles` | PK→auth.users cascade; checks on name, avatar https, X handle, LinkedIn prefix | Good. `timezone` isn't validated against real zones in SQL (app validates). `deletion_requested_at` only a flag (F-08). |
| `categories` | text PK | Fine. Text PK used as FK — renaming a category requires `on update cascade` (not set). |
| `startup_submissions` | uuid PK; `unique(owner_id, website_url)`, `unique(owner_id, stripe_account_id)`, `unique(id, owner_id)`; many checks | Rich, well-constrained. Dead columns: `addon_interests`, `wants_sale` (written, never read), `anonymous` (never settable via UI). `provider` and the `*_id` columns duplicate `startup_payment_sources` (legacy). |
| `startup_payment_sources` | composite FK (startup_id, owner_id) → submissions, `unique(owner, provider, external_id)`, jsonb size check | Good ownership modelling. `metrics` jsonb is owner-writable (F-21). No `updated_at`. |
| `startups` | slug unique, `submission_id` unique | Copies of draft fields at publish time (intentional snapshot). `product_details` jsonb uses display labels as keys ("Value proposition") — presentation leaking into data (F-34). No index on `owner_id` (used by `seller_publications`). |
| `revenue_snapshots` | PK (startup_id, measured_on) | Good for "latest snapshot" lateral joins. Growth columns never populated (F-04). |
| `sale_listings` | partial unique index one-active-per-startup; status check; `active ⇒ listed_at` | `views`, `offers` never written (dead); `featured`, `public_preview` only settable by SQL. |
| `seller_leads` | unique (listing, buyer); `seller ≠ buyer`; indexes on (seller, created) and (buyer, created) | Denormalised `buyer_name`/`startup_name` snapshots (intentional for redaction). `inquiry_status` check-constrained text (consistent). |
| `seller_lead_messages` | FK cascade; index (lead, created desc, id) | Good. No soft delete/moderation fields. |
| `saved_listings` | PK (buyer, listing) | No index on `listing_id` alone (cascade deletes scan). |
| `activity_posts` / `activity_likes` | FKs; likes PK (post,user) + user index | No create path (F-11). No index on `activity_posts(startup_id)` or `published_at`. |
| `seller_feedback` / `buyer_feedback` | PK (owner, slot 1–10) | Neat rate-limit-by-schema. Identical tables could be one table with a `role` column. |
| `buyer_profiles` | PK→auth.users; budget range check | Budgets stored in **whole dollars** while every other amount uses **cents** (F-34). |
| `sponsorships` | slot unique 1–20; partial unique active per owner; `(state='ended') = (slot is null)` | Good state integrity. Seed rows (real brands) inserted by a schema migration (F-02, F-32). |

## Normalisation
- 1NF: array columns (`markets`, `tech_stack`, `marketing_channels`, `categories`, `addon_interests`, `home_positions`) are bounded tag lists; acceptable in Postgres and not queried relationally. Keep.
- 2NF/3NF: `startups` duplicates `startup_submissions` by design (published snapshot). `seller_leads.buyer_name/startup_name` are deliberate denormalisations for privacy. No harmful redundancy found. Two parallel profile tables (`profiles`, `buyer_profiles`) duplicate name/bio/notification concepts. Merging is optional; the separation is defensible.

## Data integrity
- Strong: check constraints on lengths, URL schemes, enums, numeric ranges; composite FKs enforce ownership; unique partial indexes prevent duplicate active listings and sponsorships.
- Gaps:
  - No `updated_at` columns anywhere — no audit trail of edits, price changes or status changes (only `previous_price_cents`).
  - `profiles` rows are created lazily (upsert on first save or at publish). Leaderboard `founder` can be `null` → shows "-".
  - Deleting an auth user cascades leads, messages and drafts, but `startups.owner_id` is `set null` → orphaned public startups with no owner who can withdraw them.
  - Category FK lacks `on update cascade`.
- Live data checks: not possible beyond the anonymous role (public views returned 0 rows; 10 seed sponsors present).

## Recommendations
1. Add `created_at/updated_at` (trigger-maintained) to mutable tables; consider an append-only `listing_events` table for price/status history.
2. Remove or wire up dead columns (`views`, `offers`, `addon_interests`, `wants_sale`, legacy `provider`/`stripe_account_id`/`revenuecat_project_id` on submissions).
3. Store buyer budgets in cents (or rename columns `budget_min_usd`) for consistency.
4. Store `product_details` with stable keys (`value_proposition`, …) and map labels in the UI.
5. Decide the fate of published startups whose owner deletes their account (withdraw listings automatically).
