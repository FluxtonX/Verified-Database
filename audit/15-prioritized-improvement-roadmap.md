# 15 — Prioritised findings and improvement roadmap

Severity: **P0** critical · **P1** high · **P2** medium · **P3** low · **P4** informational.
Type: **Bug** (confirmed functional defect) · **Vuln** (confirmed security weakness) · **Potential** (plausible risk, not exploited) · **Arch** · **Perf** · **UX** · **Legal** (content/compliance, not a code vulnerability) · **Opt** (optional improvement).

**No P0 findings.** Each finding lists: category · severity · type · location · evidence · problem · consequences · recommendation · approach · verification · dependencies/risks.

---

## P1 — High

### F-01 · Content/Legal · P1 · Legal
- **Location:** `src/components/AddStartupModal.tsx` (testimonial figure), `public/assets/testimonial-ryan.jpg`
- **Evidence:** a five-star quote attributed to "Ryan Vogel · Inbound Email" claims "Over 60% of my traffic this week came from VerifedDB", shown to every founder adding a startup. The product has no users who could have given it.
- **Problem / consequences:** fabricated endorsement with a real-looking person and photo. Consumer-protection (e.g. FTC endorsement rules) and personality-rights exposure; destroys trust if discovered.
- **Recommendation:** remove it now; add real testimonials only with written consent.
- **Approach:** delete the `<figure>` and the image; replace with a three-step "what happens next" list.
- **Verification:** grep for the name; visual check of the modal.
- **Risks:** none.

### F-02 · Content/Legal/Privacy · P1 · Legal
- **Location:** `supabase/migrations/20261110000600_sponsorships.sql` (10 `seed` rows), `src/data/homepage.json`, `src/data/acquire.ts`, `src/data/acquire-founders.json`, `AcquireMarketplace.tsx` (founder posts mentioning `@Trust_MRR`, `@marclou`), `public/assets/reference-*`
- **Evidence:** anonymous `sponsorship_catalog` RPC on production returns the 10 seed cards (Chargeback.io, GojiberryAI, Hugo AI, …) displayed as sponsors; real founders' names and avatars (e.g. leaderboard sample) found inside `.next/static/chunks/*.js`.
- **Problem / consequences:** implies paid endorsements from companies that haven't bought them; republishes another site's data and third-party personal data (names, photos, posts) to every visitor. Trademark, false-advertising, copyright and GDPR exposure.
- **Recommendation:** remove seed sponsors (show an "Your startup here" placeholder instead); replace demo data with clearly fictional data or remove demo mode; delete copied images.
- **Approach:** new migration `delete from sponsorships where state = 'seed'`; move any demo fixtures to a dev-only seed file; stop importing demo JSON in production bundles.
- **Verification:** anon RPC returns no seed cards; grep the build output for third-party names.
- **Risks:** "spots left" count rises from 8 to 18; check the wording.

### F-03 · Business logic · P1 · Bug
- **Location:** `src/app/catalog-actions.ts` (`saveStartup`, the only writer of `anonymous`, is never called); migration grants omit `anonymous` from `update`; copy in `Home.tsx`, `AcquireMarketplace.tsx` (added in the redesign)
- **Evidence:** `grep` shows no caller of `saveStartup`; `startup_submissions` update grant list lacks `anonymous`.
- **Problem / consequences:** the site promises "Stay anonymous if you want", but no founder can set it; buyers and founders are misled; a founder expecting anonymity is exposed when publishing.
- **Recommendation:** either implement the toggle or remove the claims immediately.
- **Approach:** add `anonymous` to the update grant + a checkbox in `StartupDetailsForm` + `updateStartupDetails`; republish to apply. Views already redact.
- **Verification:** toggle on → republish → listing shows "Unnamed Company", no website/logo; SQL test for redaction exists.
- **Risks:** changing anonymity after buyers saw the identity can't un-reveal it; warn in UI.

### F-04 · Business logic · P1 · Bug
- **Location:** `publish_startup_listing` (sets growth `null`, `includes_nonrecurring = true`), `leaderboard` view (only published startups), `Home.tsx` ("Updated live", "MoM growth" toggle)
- **Evidence:** SQL in `20261117000000_buyer_marketplace.sql`; `startups` is inserted only by the publish function (grep).
- **Problem / consequences:** the "database of verified startup revenues" can contain only startups listed for sale; numbers are frozen at the last publish (withdrawn/sold startups keep stale figures indefinitely); growth is never computed; every row shows the "includes non-recurring" warning. The home snapshot says "Updated live".
- **Recommendation:** decide the product rule (ambiguity 1 in report 02). Minimum: compute growth from the previous snapshot, label snapshot dates, hide the growth sort, change "Updated live". Full: let founders publish to the leaderboard without listing, and refresh snapshots on a schedule (needs stored, revocable access, e.g. Stripe Connect).
- **Approach:** in `publish_startup_listing`, compute `revenue_growth_pct` from the latest earlier snapshot; set `includes_nonrecurring` from the provider data; add `measured_on` to the leaderboard view and show "as of".
- **Verification:** SQL test with two snapshots; UI shows growth and dates.
- **Risks:** growth between irregular publishes isn't month-over-month; label it accordingly.

### F-05 · Functionality/UX · P1 · Bug
- **Location:** `AcquireMarketplace.tsx` (`marketplace-locked` block), `publish_startup_listing` (`public_preview = true`)
- **Evidence:** browser on local production build: guest sees lock card + blurred fabricated cards; SQL makes every listing public.
- **Problem / consequences:** misleading UI that implies hidden inventory; contradicts the data model.
- **Recommendation:** pick one model. Either remove the gate (everything public), or make `public_preview` a real choice and show the real hidden count.
- **Approach:** render the gate only when `count(hidden) > 0`, using a count from a definer function; never use fabricated cards.
- **Verification:** guest view with 0 hidden listings shows no gate.
- **Risks:** none.

---

## P2 — Medium

### F-06 · Security · P2 · Vuln
- **Location:** `next.config.ts` (no `headers()`); production responses
- **Evidence:** `curl -D -` on production: only HSTS; no CSP, `frame-ancestors`/`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`; `x-powered-by: Next.js`.
- **Problem / consequences:** clickjacking of dashboard actions; weaker XSS containment.
- **Recommendation / approach:** add `headers()` with `Content-Security-Policy` (start in report-only; allow Supabase, Stripe, `*.mzstatic.com`, `appatar.io`), `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a minimal `Permissions-Policy`; set `poweredByHeader: false`.
- **Verification:** `curl -I`; securityheaders.com; check Stripe redirects and images still work.
- **Risks:** CSP can break inline styles/scripts; roll out in report-only first.

### F-07 · Security · P2 · Potential
- **Location:** all Server Actions; RPCs `contact_listing`, `send_*_message`, `set_saved_listing`; `importStartupSource`
- **Evidence:** no rate-limit code or DB throttle.
- **Problem / consequences:** message/inquiry spam to sellers, lead flooding, server-time exhaustion via repeated imports.
- **Recommendation / approach:** per-user limits in SQL (count messages per lead per hour inside the definer functions) and/or edge limits (Vercel WAF / Upstash) for imports; cap imports per user per hour.
- **Verification:** integration test sending N+1 messages expects an error.
- **Risks:** set limits generously to avoid blocking real conversations.

### F-08 · Compliance · P2 · Bug
- **Location:** `requestAccountDeletion` (sets `deletion_requested_at` only)
- **Problem / consequences:** users believe deletion is requested; nothing happens. Right-to-erasure obligations.
- **Recommendation / approach:** scheduled job (Supabase cron / Edge Function) that withdraws listings, deletes storage objects and calls `auth.admin.deleteUser` after a grace period; email confirmation; add data export.
- **Verification:** test user deleted end-to-end in staging.
- **Risks:** decide what happens to completed-deal records and public startups (`owner_id` set null).

### F-09 · Functionality · P2 · Bug
- **Location:** seller/buyer notification settings; no email sender exists
- **Problem / consequences:** new buyer messages and inquiries go unnoticed; deals stall.
- **Recommendation / approach:** database webhook or trigger → Edge Function → transactional email (Resend/Postmark), respecting `notify_*` flags; batch digests.
- **Verification:** message in staging triggers one email.
- **Risks:** deliverability setup (SPF/DKIM).

### F-10 · Functionality · P2 · Bug
- **Location:** `startup_submissions`, `startup_payment_sources` (no DELETE grant/policy/UI)
- **Recommendation / approach:** "Delete startup" (blocked while a listing is active) and "Disconnect provider" with confirmation; add DELETE grants + owner policies; remove storage object.
- **Verification:** RLS test that user B can't delete user A's draft.

### F-11 · Functionality · P2 · Bug
- **Location:** `activity_posts` (no user write path), home "Building in public"
- **Recommendation / approach:** either build "Post an update" for published startups (insert via definer function, rate-limited, length-checked) or hide the section.
- **Verification:** post appears on home; anonymous startups excluded.

### F-12 · Governance · P2 · Arch
- **Location:** `requestSaleListing` (writes `wants_sale`, never read); no admin UI; `featured`/`public_preview` only via SQL
- **Recommendation / approach:** remove "Request listing review", or build a minimal operator view (Supabase Studio saved queries are enough initially) with takedown for listings, messages and sponsor cards; add a "Report" link on listings and messages.
- **Risks:** moderation policy must be written first.

### F-13 · Business logic · P2 · Bug
- **Location:** `withdraw_startup_listing`
- **Evidence:** updates `inquiry_status = 'declined'` without inserting a message (unlike `update_acquisition`).
- **Recommendation / approach:** insert "Listing withdrawn by the seller." into each affected thread; confirm in UI before withdrawing.
- **Verification:** SQL test asserts a message per affected lead.

### F-14 · Performance · P2 · Perf
- **Location:** `readSponsorPrice()` and `catalogContext()` on `/`, `/acquire`, `/advertise`
- **Evidence:** TTFB 0.5 s vs 0.015 s for `/login` (measured; Stripe's share not isolated).
- **Recommendation / approach:** cache the price for 1 h and categories for 1 day; fetch auth claims in parallel with data.
- **Verification:** re-measure TTFB; count Stripe API calls in the dashboard.

### F-15 · Performance/Scalability · P2 · Perf
- **Location:** `readMarketplace` (loop of 250-row pages), `AcquireMarketplace` client filtering, `BuyerDashboard` recommendations
- **Recommendation / approach:** URL-param filters → PostgREST filters, keyset pagination, `limit 3` recommendation query.
- **Verification:** payload size constant as listings grow; filter results match.

### F-16 · Accessibility · P2 · UX
- **Location:** `--ink-3 #8a867c` (globals/theme/modules), introduced by the redesign
- **Evidence:** contrast 3.28:1 on `#f5f3ee`, 3.63:1 on white (computed).
- **Recommendation / approach:** change token to ≈`#6f6b62`; re-check eyebrows and placeholders.
- **Verification:** axe scan; contrast ≥ 4.5:1.

### F-17 · UX · P2 · UX
- **Location:** missing `loading.tsx`, `error.tsx` (root), `global-error.tsx`, `not-found.tsx`; listing "unavailable" returns 200
- **Recommendation / approach:** add skeletons for dashboard/marketplace, branded 404/500, call `notFound()` for missing listings.
- **Verification:** throttled navigation shows skeleton; `curl` returns 404.

### F-18 · Observability · P2 · Arch
- **Location:** all actions/handlers (errors swallowed)
- **Recommendation / approach:** central `logError(context, error)`; Sentry or Vercel Observability; alert on webhook 500s.
- **Verification:** forced error appears in logs with action name and code.

### F-19 · Testing · P2 · Arch
- **Location:** no CI; SQL suite unautomated; no E2E
- **Recommendation / approach:** see report 13 roadmap (CI → SQL tests in CI → fixtures → Playwright).

### F-20 · SEO · P2 · Opt
- **Location:** no robots/sitemap/canonical/OG; static listing titles; outdated `llms.txt`
- **Recommendation / approach:** see report 14.

---

## P3 — Low

| ID | Category · Type | Location | Problem | Recommendation | Verification |
|---|---|---|---|---|---|
| F-21 | Security · Vuln (low impact) | `startup_payment_sources` grants; RPC `p_metrics` | Owners can write arbitrary metrics shown on their private preview | Revoke `metrics/synced_at` insert/update from `authenticated`; write metrics only via a service-role path after server import, or label the preview "unverified until published" | Direct PostgREST update returns 42501 |
| F-22 | Business logic · Bug | `publish_startup_listing` | Relisting keeps old `listed_at` → recency sorts/filters wrong | Set `listed_at = now()` when status changes from non-active to active | SQL test |
| F-23 | Maintainability · Arch | `saveStartup`, `sponsors.json`, `providers.json`, `homepage.json` maps, `views/offers`, `addon_interests`, legacy CSS, 2.1 MB unused asset, `.idea/` Dart configs | Dead code/data | Delete; fold `theme.css` into modules and remove superseded legacy CSS | Build + visual regression |
| F-24 | Architecture · Arch | queries inline in pages; 3× `account()`; ≥6 UUID regexes; manual row types | Duplication and drift | `src/server/` DAL with `server-only`, generated `Database` types, one `requireUser()` and `isUuid()` | `tsc` catches schema changes |
| F-25 | Performance · Perf | `Home.tsx`, `AcquireMarketplace.tsx` fully client | Large hydration; demo data shipped | Server components + client islands; dev-only demo data | Bundle size drops |
| F-26 | Security · Potential | `sponsor-billing.ts`, `publish-actions.ts` | No `server-only` guard | `import "server-only"` | Build fails if imported client-side |
| F-27 | Security · Potential | owner-executed views, `marketplace_details` uses `m.*` | Future column leaks | Explicit column lists; `supabase db lint` in CI | Lint passes |
| F-28 | UX | Seller inbox | No buyer context | Show buyer profile summary via a definer view | Visual |
| F-29 | UX | Inquiry Decline/Close | No confirmation for irreversible actions | Two-step confirm | Visual |
| F-30 | Performance | `InboxRefresh` 15 s polling | Full re-render per tab | Supabase Realtime | Network panel |
| F-31 | Accessibility · Bug | `SellerInbox.tsx` "Awaiting reply" link with `aria-pressed` (added in redesign) | Invalid ARIA | `aria-current` or a real button | axe |
| F-32 | Database · Arch | sponsor seed rows in schema migration; two migrations without transactions; no type generation | Hard to remove data, drift unnoticed | Separate `seed.sql`; `supabase db diff` in CI | CI |
| F-33 | Database · Perf | missing indexes for growth | Seq scans at scale | Indexes listed in report 07 | `EXPLAIN` on staging |
| F-34 | Database · Arch | budgets in dollars vs cents elsewhere; `product_details` keyed by labels | Inconsistency | Normalise units; stable keys | Tests |
| F-35 | Product · Opt | "VerifedDB" name | Misspelling; "Verified" implies a verification service the business disclaims | Consider renaming before launch | — |
| F-36 | Privacy · Potential | sponsor `logo_url` external URLs | Hotlinking/tracking | Require upload (copy external image into bucket on save) | — |

## P4 — Informational

| ID | Note |
|---|---|
| F-37 | PostgREST error hints reveal table names to anonymous callers; `x-powered-by` header. Low value to attackers; fix the header with F-06. |
| F-38 | Prefer Stripe Connect (read-only OAuth) over pasted restricted keys; enables scheduled refresh (F-04) and removes key handling. |
| F-39 | Revenue = gross captured minus refunds, includes one-time charges, excludes fees; multiple = price ÷ (30-day revenue × 12). State these definitions next to the numbers. |
| F-40 | Supabase Auth settings (redirect allow-list, rate limits, optional MFA) and Vercel env configuration couldn't be inspected; review them in the dashboards. |
| F-41 | Provider import runs up to ~35 s inside a Server Action; on platforms with shorter limits it fails mid-import. Move large imports to a background job with progress. |

---

## Suggested sequencing

| Phase | Scope | Findings |
|---|---|---|
| 1 — This week (trust & honesty) | Remove fabricated/copied content and inaccurate claims; fix or remove the guest gate | F-01, F-02, F-03 (copy), F-04 (copy), F-05 |
| 2 — Before launch (safety) | Security headers, rate limits, logging, deletion process, notifications, delete startup, withdrawal messages, contrast | F-06, F-07, F-18, F-08, F-09, F-10, F-13, F-16 |
| 3 — Quality | CI + SQL tests + Playwright; loading/404; SEO basics; caching; server-side marketplace queries | F-19, F-17, F-20, F-14, F-15 |
| 4 — Product depth | Anonymity feature, leaderboard rules and refresh, founder updates, moderation, buyer context in inbox | F-03, F-04, F-11, F-12, F-28 |
| 5 — Maintainability | DAL + generated types, dead code, CSS consolidation, indexes, migrations hygiene | F-21…F-27, F-30…F-36 |
