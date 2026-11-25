# 09 — Supabase RLS audit

Every table in `public` has RLS enabled and all privileges revoked from `public`, `anon` and `authenticated` before selective grants. That two-layer model (column grants + policies) is the right approach and is why the anonymous probes in report 08 were all denied.

## Per-table review

| Table | anon | authenticated grants | Policies (USING / WITH CHECK) | Verdict |
|---|---|---|---|---|
| `profiles` | none | select; insert/update on listed columns (incl. `id`) | select/insert/update `id = auth.uid()` | ✅ Owner-only. Other users' names reach the public only through views. |
| `categories` | select | select | select `true` | ✅ Intended. |
| `startup_submissions` | none | select; insert (limited cols); update (many cols, not `owner_id`, not `anonymous`) | select/insert/update `auth.uid() = owner_id` | ✅ Secure. Note: `anonymous` absent from update grant makes the feature unreachable (F-03). No DELETE (F-10). |
| `startup_payment_sources` | none | select; insert (startup_id, provider, external_id, name, **metrics, synced_at**); update (name, **metrics, synced_at**) | ALL `owner_id = auth.uid()` (USING + CHECK); composite FK ties to owned draft | ⚠️ Owner can forge their own metrics (F-21). Cross-user writes impossible. |
| `startups` | none | none | none | ✅ Service role only (publish function). |
| `revenue_snapshots` | none | none | none | ✅ Service role only. |
| `sale_listings` | none | none | none | ✅ Changes only through definer functions. |
| `activity_posts` | none | none | none | ✅ (but no user write path at all — F-11). |
| `activity_likes` | none | select; insert(post_id); delete | select/delete own; insert own **and** post must be in `marketplace_updates` | ✅ |
| `seller_leads` | none | select on listed columns (incl. `buyer_id`, `seller_id`); update(archived) | select: seller **or** buyer; update: seller only | ✅ Buyers can't archive; `buyer_id` UUID is visible to the seller (low). |
| `seller_lead_messages` | none | select | select `exists(lead visible to caller)` | ✅ Participants only (relies on `seller_leads` RLS inside the subquery — correct, invoker context). Inserts only via definer functions. |
| `seller_feedback`, `buyer_feedback` | none | select | select own | ✅ Inserts via definer functions with 10-slot cap. |
| `buyer_profiles` | none | select/insert/update | ALL `id = auth.uid()` | ✅ |
| `saved_listings` | none | select | select own | ✅ Writes via `set_saved_listing`. |
| `sponsorships` | none | none | none | ✅ Service role + `sponsorship_catalog()` projection. |

## Views (owner-executed, i.e. bypass RLS)

| View | Granted to | Redaction | Verdict |
|---|---|---|---|
| `leaderboard` | anon, authenticated | Hides name/description/logo/founder for anonymous startups | ✅ Exposes startup UUIDs (harmless). |
| `marketplace` | anon, authenticated | Same redaction; guests limited to `public_preview` rows | ✅ (every publish sets `public_preview = true`; see F-05) |
| `marketplace_details` | anon, authenticated | Builds on `marketplace`, adds website/product details (redacted for anonymous) and `is_owner` | ⚠️ `select m.*` will expose any column later added to `marketplace` (F-27). |
| `marketplace_updates`, `activity_feed` | anon, authenticated | Excludes anonymous startups | ✅ |
| `buyer_conversations` | authenticated | `where buyer_id = auth.uid()` | ✅ |
| `seller_publications` | authenticated | `where s.owner_id = auth.uid()` | ✅ |

Recommendation: on Postgres 15+ consider `security_invoker = true` views plus narrow SELECT policies, or keep definer views but add a CI check (Supabase `db lint`) and an explicit column list instead of `m.*`.

## Functions

| Function | Mode | Executable by | Checks | Verdict |
|---|---|---|---|---|
| `save_startup_payment_source`, `save_revenuecat_app_profile` | invoker, `search_path=''` | authenticated | `auth.uid()` not null; draft ownership; advisory lock | ✅ (accepts client `p_metrics`, F-21) |
| `update_seller_lead_after_message` (trigger) | definer | revoked from all | — | ✅ |
| `send_seller_message` / `send_buyer_message` | definer | authenticated | caller must be the lead's seller / buyer | ✅ (no rate limit, F-07) |
| `submit_seller_feedback` / `submit_buyer_feedback` | definer | authenticated | lock + slot cap | ✅ |
| `ensure_buyer_lead` | definer | **revoked** (internal) | listing active, not own, buyer profile | ✅ |
| `set_saved_listing`, `contact_listing` | definer | authenticated | identity from `auth.uid()`, locks, validation | ✅ `contact_listing` doesn't check `auth.uid()` before building the lock key, but `ensure_buyer_lead` raises immediately after; anon is revoked anyway. |
| `update_acquisition` | definer | authenticated | participant check, state machine, listing lock | ✅ |
| `publish_startup_listing` | definer | service_role only (verified live) | ownership by `p_owner`, completeness, financial bounds | ✅ Relies on the caller passing the right `p_owner` (server derives it from `getUser()`). |
| `withdraw_startup_listing` | definer | authenticated | owner check | ✅ |
| `sponsorship_catalog` | definer | anon, authenticated | read-only projection | ✅ |
| `reserve_sponsorship` | invoker | service_role only | global lock | ✅ |

All definer functions set `search_path = ''` and schema-qualify objects. No dynamic SQL. No recursive policy logic.

## Storage policies

| Bucket | Public | Policies | Verdict |
|---|---|---|---|
| `startup-draft-logos` | no | select/insert/update only where object name = `<owner>/<owned draft id>.png` | ✅ No delete policy (files persist after draft changes; no draft delete exists anyway). |
| `profile-pictures` | yes | insert/update/select metadata only for `<uid>.png` | ✅ Public read by URL is intended. |
| `listing-logos` | yes | none for users (service role writes) | ✅ |
| `sponsor-logos` | yes | none for users (service role writes) | ✅ Old files removed on replacement; not removed when a sponsorship ends. |

Anonymous listing of all four buckets returned empty arrays (no enumeration).

## Gaps in RLS test coverage
`tests/marketplace.sql` covers buyer/seller isolation, spoofing, transitions and redaction well. It does **not** cover `startup_submissions`, `startup_payment_sources`, `profiles`, storage policies, `activity_likes`, or the sponsorship functions, and it isn't run automatically (F-19).
