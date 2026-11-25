# 05 — Functionality matrix

Legend: ✅ verified working · ⚠️ works with defects · ❌ missing/broken · 🔍 code-verified only (needs a signed-in session to execute).

| Screen / feature | Control | Wired to | Validation | Loading | Errors | Empty state | Status |
|---|---|---|---|---|---|---|---|
| Home – search | input | client filter | n/a | n/a | n/a | "No startups match" | ✅ |
| Home – List startup | button | AddStartupModal | n/a | — | — | — | ✅ |
| Home – listing tabs | segmented | client state | n/a | — | — | Empty card + CTA | ✅ |
| Home – leaderboard sort | MRR / MoM growth | client sort | n/a | — | — | ✅ | ⚠️ growth always "—" (F-04) |
| Home – founder updates | like/share | `setActivityLike` | UUID | disabled while pending | inline alert | "No updates yet" | ⚠️ no way to create posts (F-11) |
| Home – sponsor panel | Advertise here | dialog + checkout | price ID check | — | redirect errors | "could be the first card" | ✅ |
| Marketplace – filters | 11 fields | client filter | numeric inputs | — | — | ✅ | ⚠️ scale (F-15); "Founded" text→date input trick |
| Marketplace – sort | details menu | client sort | — | — | — | — | ✅ |
| Marketplace – save (heart) | button | `setSavedListing` | UUID | disabled | popover | — | 🔍 |
| Marketplace – guest gate | links | `/login?next=/acquire` | — | — | — | — | ⚠️ misleading (F-05) |
| Listing – contact / inquiry | form | `contactListing` | body ≤2000, offer cents | "Sending…" | ✅ | — | 🔍 |
| Add startup modal | form | `importStartupSource` | key/handle/project regex | "Importing metrics…" | ✅ | — | 🔍 fake testimonial (F-01) |
| Startup details | form | `updateStartupDetails` | thorough | "Saving…" | ✅ | — | 🔍 |
| Logo picker | file | `uploadStartupLogo` | PNG magic + size | "Uploading…" | ✅ | — | 🔍 |
| Publish listing | form | `publishListing` | price, source, key | "Verifying & publishing…" | ✅ | — | 🔍 |
| Request listing review | button | `requestSaleListing` | — | "Saving…" | ✅ | — | ❌ no consumer (F-12) |
| Withdraw listing | button | `withdrawListing` | UUID | "Withdrawing…" | ✅ | — | ⚠️ no confirmation, buyers not told (F-13) |
| Seller inbox – folder/filter | links | query params | — | — | — | ✅ | ✅ (invalid ARIA, F-31) |
| Seller inbox – reply | form | `sendSellerMessage` | ≤2000 | "Sending…" | ✅ | — | 🔍 |
| Seller inbox – archive | button | `setSellerLeadArchived` | UUID | disabled | ✅ | — | 🔍 |
| Inquiry actions | buttons | `updateAcquisition` | status enum + SQL state machine | "Updating…" | ✅ | — | ⚠️ decline lacks confirm (F-29) |
| Interested buyers | link | chat thread | — | — | ✅ | ✅ | ✅ |
| Seller profile + picture | forms | `savePublicProfile`, `uploadProfilePicture` | lengths, PNG | ✅ | ✅ | — | 🔍 |
| Socials | forms | `saveSocialLink` | X regex, LinkedIn URL | ✅ | ✅ | — | 🔍 |
| Settings – notifications | toggles | `saveSellerPreferences` | timezone | ✅ | ✅ | — | ⚠️ no emails sent (F-09) |
| Settings – change email | form | `auth.updateUser` | email regex | ✅ | ✅ | — | 🔍 |
| Settings – delete account | form | `requestAccountDeletion` | "DELETE" | ✅ | ✅ | — | ❌ nothing processes it (F-08) |
| Feedback (both roles) | form | RPC | ≤2000, 10 max | ✅ | ✅ | — | 🔍 |
| Buyer overview / pipeline / inbox | links, forms | RPCs | ✅ | ✅ | ✅ | ✅ | 🔍 |
| Buyer profile | form | `saveBuyerProfile` | budget digits, categories exist | ✅ | ✅ | — | 🔍 |
| Advertise – checkout / card / billing | forms | advertise actions | URL, file magic bytes | redirects | query-param errors | — | 🔍 |
| 404 | — | default Next page | — | — | — | — | ⚠️ unstyled (F-17) |

## Duplicate-submission protection
- Forms disable their submit button while pending (`useActionState` / `useTransition`). Server functions are idempotent where it matters (`on conflict`, advisory locks, unique partial indexes, Stripe idempotency key). No double-charge or duplicate-lead path was found.

## Confirmed bugs (functional)
1. Anonymity unreachable; copy promises it (F-03).
2. Growth metrics never populated; growth sort is meaningless (F-04).
3. Relisting keeps the original `listed_at` (F-22).
4. Guest gate shows fabricated cards over a full, visible catalog (F-05).
5. Invalid ARIA (`aria-pressed` on a link) in the inbox filter (F-31).
