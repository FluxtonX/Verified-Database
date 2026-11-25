# 04 — User journey audit

Method: code tracing of every route and action, plus browser checks of public pages on a local production build (`next start`, port 3010) against the real Supabase project, and signed-in screens rendered with sample data on a throwaway copy (no real account was created). Status column: ✅ works, ⚠️ works with problems, ❌ broken or missing.

## Roles
- **Visitor** (not signed in)
- **Founder / seller** (signed in, seller mode)
- **Buyer** (signed in, buyer mode, needs a buyer profile to act)
- **Sponsor** (signed in, paying subscriber)
- **Operator/admin** — no UI exists; all admin work requires SQL

## Visitor
| Journey | Status | Notes |
|---|---|---|
| Land on home, understand offer | ⚠️ | Clear value prop. "Updated live" and "Stay anonymous if you want" claims are inaccurate (F-04, F-03). Founder updates section always empty (F-11). |
| Search startups | ✅ | Filters leaderboard and listings in the browser. |
| Browse marketplace | ⚠️ | All listings are actually visible, yet a lock overlay with fabricated cards says "Create a free account to see all available listings" (F-05). |
| Open listing | ✅ | Unavailable/unknown UUID shows a friendly card (HTTP 200, soft 404). Non-UUID path → unstyled default 404 (F-17). |
| Click "List startup" | ✅ | Opens modal; submit becomes "Sign in to add". |
| Advertise | ✅ | Offer dialog and `/advertise` page; checkout requires sign-in. |
| Sign up / log in | ✅ | Google only. There's no email/password, magic link, or other provider; users without Google can't join. |
| Email verification / password recovery | n/a | Not applicable to Google-only auth. Email *change* flow exists in settings. |

## Founder / seller
| Journey | Status | Notes |
|---|---|---|
| First login → dashboard | ⚠️ | Lands on "My startups" with "Connect Stripe or RevenueCat" empty state. No onboarding explaining the publish steps. |
| Import from Stripe/RevenueCat | ⚠️ | Works; long waits (up to ~35 s) with only a "Importing metrics…" label; no rate limit. |
| Edit details, upload logo | ✅ | Good validation and messages. |
| Choose anonymity | ❌ | No control exists (F-03). |
| Publish listing | ⚠️ | Must paste the provider secret key again on every publish/price change. Clear copy that the key isn't saved. |
| Request listing review | ❌ | Saves a flag nobody reads (F-12). |
| Withdraw listing | ⚠️ | Works; buyers' inquiries silently become "Declined" (F-13). |
| Delete a startup / disconnect provider | ❌ | Not possible (F-10). |
| Inbox: read, reply, archive | ✅ | Works; refresh by polling; no email alerts (F-09). |
| Respond to inquiry | ⚠️ | "Decline" is irreversible without confirmation (F-29). No view of buyer's profile/budget (F-28). |
| Mark acquired | ✅ | Has a confirmation step; closes competing inquiries. |
| Post a founder update | ❌ | No feature (F-11). |
| Profile, socials, settings | ⚠️ | Notification toggles say "Email delivery is pending setup". |
| Delete account | ❌ | Only records a request (F-08). |

## Buyer
| Journey | Status | Notes |
|---|---|---|
| Save a listing without profile | ✅ | Redirects to buyer profile, then back to the listing (`returnTo`). |
| Create buyer profile | ✅ | Separate from seller profile (can confuse dual-role users). |
| Contact seller / send inquiry with offer | ✅ | Validated; duplicate open inquiry blocked in SQL. |
| Track pipeline (Saved / Conversations / Inquiries) | ✅ | |
| Withdraw inquiry | ✅ | |
| Recommendations | ⚠️ | Loads the full catalog for 3 suggestions (F-15). |

## Sponsor
| Journey | Status | Notes |
|---|---|---|
| Buy a slot | ✅ | Reservation hold, idempotent checkout, webhook reconciliation. |
| Publish card (upload or URL logo) | ✅ | Strong file validation. External logo URLs are hotlinked (F-36). |
| Manage billing | ✅ | Stripe customer portal. |

## Cross-cutting
- **Session expiry:** `proxy.ts` refreshes cookies; expired sessions on actions return "Sign in to …" messages rather than redirecting. Acceptable.
- **Unauthorized access:** `/dashboard` and `/startup/[id]` redirect to login (verified on production: 307 → `/login?next=…`). Cross-user access is blocked by RLS (see 09).
- **Logout:** `signOut({ scope: "local" })` then redirect to `/login`. Works.
- **Loading feedback:** no route-level loading UI; dashboard navigations show nothing until the server responds (F-17).
