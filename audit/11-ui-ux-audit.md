# 11 — UI/UX audit

Inspected in the in-app browser at 1440×900 and 375×812 (public pages on a local production build; signed-in screens rendered with sample data), plus code review. The visual system was redesigned in the last three commits; several issues below were **introduced by that redesign** and are labelled as such.

## Visual consistency
- Shared tokens (`--paper`, `--ink`, `--ink-2/3`, `--line`, `--accent`, `--lime`), three font families (Geist, Geist Mono for numbers, Instrument Serif italics for accents), one header/footer/CTA component set. Buttons, cards (14–22 px radii), inputs (40 px, 10 px radius) and pills are consistent across public and signed-in pages. ✅
- Remaining inconsistencies: legacy global CSS still defines older variants (e.g. `.marketplace-founder-post` X-post mimicry, `.dashboard-mode-dialog`), and `theme.css` overrides them by load order (maintenance risk, F-23). The default Next 404 page uses a different look entirely (F-17).

## Screen-specific issues

| # | Where | What's wrong | Why it matters | Recommendation |
|---|---|---|---|---|
| U-1 (F-16) | Site-wide: eyebrows, meta text, stat labels, placeholders, table headers | `--ink-3 #8a867c` is 3.28:1 on paper and 3.63:1 on white; AA needs 4.5:1 for text under 18.66 px bold / 24 px. *Introduced by redesign.* | Low-vision users can't read labels such as "Revenue · 30d", dates, counts. | Darken to about `#6f6b62` (≈5:1 on paper) or reserve `--ink-3` for non-text decoration. |
| U-2 (F-05) | Marketplace, signed-out | Lock card over blurred fabricated listings ("Get Founders", "Figmentor") although guests already see all real listings. | Misleading; the blurred cards suggest inventory that doesn't exist. | Remove the gate, or gate a real subset and show a real count ("12 more listings for members"). |
| U-3 (F-03, F-04) | Home hero bullets, "How it works", marketplace CTA, home snapshot | Copy says "Stay anonymous if you want", "Stay anonymous until you choose to share", "Updated live". *Introduced by redesign.* | Promises features that don't exist. | Ship the features or change the copy ("Snapshot from each founder's last verification"). |
| U-4 (F-11) | Home "Building in public" | Section always empty in production ("No updates yet") with no way to post. | Dead section weakens the page. | Hide until posting exists, or add a "Post update" feature to the seller dashboard. |
| U-5 (F-17) | Dashboard navigation | No `loading.tsx`; clicking a tab gives no feedback until the server finishes several queries. | Feels broken on slow networks. | Add skeleton `loading.tsx` for `/dashboard` and `/acquire`. |
| U-6 (F-17) | Unknown routes | Unstyled default 404; unavailable listing returns 200. | Off-brand, poor recovery. | Add `not-found.tsx` with header, search and links; call `notFound()` for missing listings. |
| U-7 (F-29) | Seller inbox | "Decline inquiry" / "Close inquiry" act immediately; only "Mark acquired" confirms. | Irreversible actions by misclick. | Same two-step confirm pattern as "Mark acquired". |
| U-8 (F-28) | Seller inbox | Seller sees only the buyer's name; no bio, budget, LinkedIn. | Sellers can't qualify buyers, which is the core of the deal. | Show the buyer profile summary in the "Acquisition details" panel (via a definer view with explicit columns). |
| U-9 (F-09) | Settings (both roles) | Notification toggles exist but "Email delivery is pending setup". | Users trust toggles that do nothing; replies get missed. | Implement emails, or hide toggles until then. |
| U-10 | Dashboard mode switch | Buyer and seller identities are two separate profiles with separate names/bios. | Dual-role users must maintain two profiles and may not realise it. | Explain on first switch, or share name/avatar and keep only role-specific fields separate. |
| U-11 | Publish flow | Secret key must be pasted on every publish/price update; price and verification are coupled. | Friction for a simple price change. | Allow price-only updates without re-verification (keep the last snapshot), or adopt Stripe Connect (F-38). |
| U-12 | Add startup modal | "2 payment providers" pill is decorative; fake testimonial (F-01). | Noise / trust risk. | Remove the testimonial; replace with how-it-works bullets. |
| U-13 (F-31) | Seller inbox "Awaiting reply" | `aria-pressed` on an `<a>`. *Introduced by redesign.* | Invalid ARIA; screen readers announce a toggle that's really a link. | Use `aria-current="true"` or make it a real toggle button. |
| U-14 | Listing page | MRR "Unavailable" is shown in the large mono figure style. | Reads like a number. | Use muted body text for unavailable values. |
| U-15 | Home leaderboard | "MoM growth" toggle always shows "—" (F-04). | Control with no effect. | Hide until growth data exists. |

## UI states checklist (key screens)

| Screen | Initial | Loading | Empty | Error | Success | Disabled | Permission denied |
|---|---|---|---|---|---|---|---|
| Home | ✅ | n/a (SSR) | ✅ | ✅ banner | — | — | — |
| Marketplace | ✅ | ❌ | ✅ | ✅ | — | — | ⚠️ misleading gate |
| Listing | ✅ | ❌ | — | ✅ `error.tsx` | ✅ | ✅ | ✅ sign-in / profile prompts |
| Dashboard tabs | ✅ | ❌ | ✅ (redesigned) | ✅ | ✅ | ✅ | ✅ redirect to login |
| Forms | ✅ | ✅ pending labels | — | ✅ `role=alert` | ✅ `role=status` | ✅ | — |
| Network failure | — | — | — | ⚠️ generic messages only | — | — | — |

## Responsive
Checked 375 px on home, marketplace, listing, login, advertise, buyer/seller dashboard and inbox: no horizontal page overflow (`scrollWidth = 375`). Dashboard nav becomes a horizontally scrolling strip (intentional). Touch targets: icon buttons 36–38 px (meet WCAG 2.2 AA 24 px minimum). Modals fit (`max-width: calc(100vw - 32px)`).

## Accessibility (WCAG 2.2 AA)
- ✅ `lang="en"`, one `h1` per page, logical heading order, all inputs labelled (automated check: 0 unlabelled on home/marketplace), no images missing `alt`, no unnamed buttons/links, visible `:focus-visible` outlines, native `<dialog>` with focus return, `prefers-reduced-motion` stops the ticker.
- ❌ Contrast of `--ink-3` (U-1).
- ⚠️ Ticker: duplicated row is `aria-hidden`, but a continuously moving region has no pause control other than hover. WCAG 2.2.2 requires a pause/stop for auto-moving content lasting over 5 s. Add a pause button or make it static.
- ⚠️ Invalid ARIA (U-13). Sort menu built from `<details>` lacks listbox semantics (works with keyboard, though).
- ⚠️ Status changes after Server Actions use `role="status"`, good; inbox auto-refresh doesn't announce new messages.
