# 08 — Security audit

References: OWASP ASVS 5.0, OWASP Top 10 (2021/2025 draft categories), Next.js security guidance, Supabase security docs. Secret values were never printed.

## Summary

**No P0 (critical) vulnerabilities were confirmed.** Authorization is enforced in the database, privileged keys stay server-side, the webhook is verified, and anonymous probes against the live API were correctly denied. The main security gaps are hardening (headers, rate limiting, monitoring) and governance (no moderation or admin tooling).

## Tests actually executed (non-destructive)
| Test | Result |
|---|---|
| Anonymous `GET` on all 16 tables via PostgREST | 15 denied (`42501`); `categories` readable (intended) |
| Anonymous `GET` on 7 views | public views readable (0 rows); `buyer_conversations`, `seller_publications` denied |
| Anonymous calls to 5 privileged RPCs with random UUIDs (each fails before any write) | all `permission denied for function` |
| Anonymous `sponsorship_catalog` RPC | readable (intended); returns 10 seed cards |
| GraphQL endpoint | `pg_graphql` not enabled |
| Anonymous storage listing of 4 buckets | empty lists (no enumeration) |
| Git history scan for `sb_secret_`, `sk_live_`, `rk_live_`, `whsec_`, JWTs | none found; only `.env.example` ever committed |
| Client bundle / client-component imports of secret modules | none (server-action references only) |
| Response headers on production | HSTS present; CSP, frame protection, nosniff, referrer and permissions policies absent; `x-powered-by` present |
| `npm audit` | 0 vulnerabilities |

Not executed: authenticated cross-user tests against the live DB (would need test accounts and writes), `tests/marketplace.sql` (needs a disposable local database), Supabase Auth dashboard settings review.

## Authentication
- Google OAuth via `signInWithOAuth` + PKCE code exchange in `/auth/callback`; the PKCE verifier cookie prevents login-CSRF/code injection. ✅
- Session cookies set `httpOnly`; refreshed in `proxy.ts`. No browser Supabase client exists, so tokens never reach JS. ✅
- Post-login redirect uses a strict allow-list (`loginDestination`) — no open redirect. Unit-tested. ✅
- `getClaims()` is used for most actions (verifies the JWT); publishing and sponsorship use `getUser()` (server round trip). ✅
- Logout: local scope. ✅
- Not verifiable: MFA (not implemented, optional for this risk level), leaked-password protection (n/a for OAuth), Auth rate limits, redirect URL allow-list in the Supabase dashboard.

## Authorization
- Every table: `revoke all` from `public/anon/authenticated`, then column-level grants + RLS. Write paths for sensitive state go through SECURITY DEFINER functions that derive identity from `auth.uid()` and set `search_path = ''`. ✅
- Server Actions re-check the user and pass only IDs; ownership is enforced again in SQL (`owner_id = auth.uid()`). No IDOR found.
- Privileged operations (publish, sponsorship writes) use the secret key only after server-side checks; `publish_startup_listing` is executable by `service_role` only (verified live).
- Detailed per-table policy review: `09-supabase-rls-audit.md`.

## Findings

| ID | Severity | Type | Summary |
|---|---|---|---|
| F-06 | P2 | Confirmed weakness | No CSP and no `frame-ancestors`/`X-Frame-Options`: any site can frame the dashboard (clickjacking against "Mark acquired", "Withdraw", account deletion). Also missing `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`; `x-powered-by` exposed. |
| F-07 | P2 | Potential vulnerability | No rate limiting on Server Actions/RPCs. A signed-in user can flood a seller with messages/inquiries, mass-save to generate leads, or trigger repeated provider imports (each up to ~100 Stripe API calls and 35 s of server time). |
| F-12 | P2 | Governance gap | No admin/moderation surface: no way to take down abusive listings, messages, or sponsor cards except raw SQL. |
| F-18 | P2 | Confirmed weakness | Errors are swallowed without logging; security-relevant failures (webhook reconcile errors, RPC permission errors) leave no trace. |
| F-08 | P2 | Compliance | Account deletion isn't processed; no data export. GDPR/CCPA right-to-erasure risk. |
| F-21 | P3 | Confirmed (low impact) | Owners can write arbitrary `metrics`/`synced_at` into their own `startup_payment_sources` (column grants + RPC `p_metrics`). Display is owner-only (`/startup/[id]`) and publication ignores stored metrics, so impact is limited to an owner misleading people with screenshots of their private preview. |
| F-26 | P3 | Hardening | Modules that read `SUPABASE_SECRET_KEY` / `STRIPE_SECRET_KEY` lack `import "server-only"`. |
| F-27 | P3 | Design risk | Public views run with owner privileges (bypass RLS) by design. Safe today because each projection is hand-redacted, but any future column added to a base table can leak through `select m.*` in `marketplace_details`. Supabase's linter flags these. |
| F-36 | P3 | Privacy | Sponsor logos may be external HTTPS URLs rendered on every page view (third-party tracking pixel / hotlink). |
| F-37 | P4 | Info disclosure | PostgREST error hints reveal table names to anonymous callers; `x-powered-by: Next.js`. |
| F-38 | P4 | Design | Founders paste live Stripe restricted keys; the app checks the `rk_live_` prefix but can't verify the key is read-only. Stripe Connect (OAuth, read-only scope) would avoid handling keys. |
| F-01/F-02 | P1 | Legal/consumer protection (not a code vulnerability) | Fabricated testimonial; unpaid third-party brands displayed as sponsors; copied third-party data and real people's names/photos in the shipped bundle. See 15. |

## Web vulnerability checklist
| Class | Result |
|---|---|
| SQL injection | Not found: all access through PostgREST/RPC parameters; PL/pgSQL uses parameters, not dynamic SQL. |
| XSS | Not found: no `dangerouslySetInnerHTML`; user URLs constrained to `http(s)` by DB checks and URL parsing; sponsor `background_color` regex-validated before reaching `style`. |
| CSRF | Server Actions are protected by Next's Origin/Host check; webhook uses signatures; OAuth uses PKCE. |
| SSRF | Not found: outbound fetches go to fixed hosts (`api.stripe.com`, `api.revenuecat.com`, `itunes.apple.com`) with `redirect: "error"`; imported logo URLs are host allow-listed. |
| Open redirect | Not found (allow-list, unit-tested). |
| Path traversal | Storage paths are built from validated UUIDs; storage RLS pins object names. |
| File upload | Magic-byte checks, size limits, bucket MIME allow-lists, fixed content types. Good. |
| Clickjacking | Vulnerable (F-06). |
| CORS | No custom API CORS; Route Handler is a webhook. N/A. |
| Insecure deserialization | `JSON.parse` only after signature check. N/A. |

## Business-logic security
- Price/total manipulation: asking price and revenue come from the server action; revenue from a fresh provider fetch. ✅
- Status manipulation: transitions enforced in `update_acquisition`. ✅
- Duplicate transactions: unique constraints + advisory locks + Stripe idempotency keys. ✅
- Race conditions: listing row locked before lead updates; sponsorship reservation serialised. ✅
- Self-dealing: a founder can inflate Stripe revenue by paying themselves; the platform doesn't (and per positioning shouldn't) detect this. Disclose it in buyer-facing copy (partly done in the footer disclaimer).
