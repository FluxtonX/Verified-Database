# 07 — Database optimisation

Query plans could not be captured: no SQL session was opened and PostgREST plan output isn't enabled. The analysis below is based on query shapes in code and the current (empty) data volume. Nothing here is urgent at today's size; it matters past roughly 1–10k listings or startups.

## Query inventory (hot paths)

| Path | Query | Frequency | Shape / cost |
|---|---|---|---|
| Home | `leaderboard` order by `mrr_cents` limit 100 | every visit | View joins `startups` + lateral latest snapshot + profile + `exists` active listing **for every published startup**, then sorts. O(startups). |
| Home | `marketplace` order by `listed_at` limit 10; deals `listed_at ≥ week` order by `multiple` limit 10 | every visit | View scans all `sale_listings` with status/date filters + lateral snapshot. `multiple` is computed, so it can't be indexed. |
| Home | `activity_feed` limit 6 | every visit | Correlated `count(*)` per post; fine at small scale. |
| Home, Marketplace | `categories` (in `catalogContext`) | every visit | Tiny, but cacheable. |
| Home, Marketplace, Advertise | `sponsorship_catalog()` RPC + **Stripe `GET /v1/prices/:id`** | every visit | Network round trip to Stripe on every render (F-14). |
| Marketplace | `marketplace` select * in 250-row pages until exhausted | every visit | O(listings) transfer and RSC payload (F-15). |
| Buyer overview | `readMarketplace` again (full catalog) for 3 recommendations | every dashboard visit | O(listings) (F-15). |
| Inbox | leads ≤100 + messages ≤100 | every 15 s per open tab (polling) | Indexed; cost is the full page re-render (F-30). |

## Index review

Existing and useful: `revenue_snapshots` PK (startup_id, measured_on) serves the lateral "latest" lookup; `seller_leads` (seller_id, created_at desc) and (buyer_id, created_at desc); `seller_lead_messages` (lead_id, created_at desc, id); `sale_listings_one_active_per_startup` (partial unique); `startup_payment_sources(startup_id)`; `activity_likes(user_id)`.

Recommended when volume grows (each justified by a query above):

```sql
-- marketplace / recency filters
create index on public.sale_listings (listed_at desc) where status = 'active';
-- seller_publications view and owner lookups
create index on public.startups (owner_id);
-- leaderboard: only published rows
create index on public.startups (published_at) where published_at is not null;
-- feed
create index on public.activity_posts (published_at desc) where published_at is not null;
create index on public.activity_posts (startup_id);
-- cascade deletes from sale_listings
create index on public.saved_listings (listing_id);
```

No duplicate or unnecessary indexes were found.

## Structural optimisations
1. **Store the multiple and latest snapshot on the listing** (or a materialised view refreshed on publish), so "best deals" and the leaderboard sort can use indexes instead of computing per row.
2. **Server-side filtering and pagination** for the marketplace: translate the 11 filters to PostgREST filters (`gte`, `lte`, `in`, `ilike`) and use keyset pagination on `(listed_at, id)`. This removes the full-catalog loop and shrinks the RSC payload.
3. **Recommendations query**: one filtered `marketplace` query with `limit 3` instead of `readMarketplace()`.
4. **Like counts**: keep a `likes_count` column maintained by trigger if the feed grows.
5. **Avoid `select *`** on views in hot paths (`marketplace`, `marketplace_details`); select only displayed columns.
6. **Caching**: cache public catalog queries and the Stripe price; invalidate on publish/withdraw/sponsor change.

## Connection management
All access goes through PostgREST over HTTPS (Supabase client), so Postgres connection pooling is handled by Supabase. No direct `pg` connections exist. Each request creates a new Supabase client object; that's cheap. No issue found.

## Migrations
- 10 forward-only migrations, timestamp ordered. Two lack `begin/commit` (`20261110000000_revenuecat_drafts.sql`, `20261117000001_sponsor_logos.sql`); both are single statements, so the risk is low.
- Seed data (10 sponsor brands) lives inside a schema migration; it can't be removed cleanly from history and re-runs in every new environment (F-32).
- No generated TypeScript types → schema drift between DB and code goes undetected (F-24).
- Drift against production couldn't be checked. Recommend `supabase db diff --linked` in CI.
