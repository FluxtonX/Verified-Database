# 14 — SEO and web standards

Checked with `curl` on production and the DOM of a local production build.

| Item | Status | Evidence / recommendation |
|---|---|---|
| Page titles | ⚠️ | Root, marketplace, login, dashboard, advertise, listing have static titles. Listing pages all say "Acquisition opportunity \| VerifedDB". Add `generateMetadata` with the startup name (or "Confidential SaaS, $X/mo" for anonymous ones). |
| Meta descriptions | ⚠️ | Root and marketplace only. Add for listing pages (category, revenue, price). |
| Canonical URLs | ❌ | None. Add `metadataBase` + `alternates.canonical`. |
| Open Graph / Twitter | ❌ | No `og:*`/`twitter:*` tags or OG images. Listings are highly shareable; add `opengraph-image.tsx` per listing (price, revenue, multiple). |
| robots.txt | ❌ | 404 on production. Add `app/robots.ts` disallowing `/dashboard`, `/startup/`, `/auth/`, `/api/`. |
| XML sitemap | ❌ | 404. Add `app/sitemap.ts` listing home, marketplace, advertise and active listing URLs. |
| Structured data | ❌ | None. Consider `Organization` on home and `Product`/`Offer` on listings (price in USD). |
| Semantic HTML | ✅ | One `h1` per page, landmarks (`header`, `main`, `footer`, `nav`, `aside`), lists and tables used properly. |
| URL structure | ⚠️ | `/acquire/<uuid>` is opaque. Optional: `/acquire/<slug>-<shortid>`. |
| Indexability of private pages | ⚠️ | `/startup/[id]` sets `noindex` ✅. `/dashboard` redirects (307) when signed out ✅ but has no `noindex` for signed-in renders; `/login` is indexable (harmless). Add `robots: { index: false }` to dashboard and login. |
| 404 handling | ⚠️ | Unknown routes → default unstyled 404 (correct status). Missing listings return **200** with "Listing unavailable" (soft 404). Use `notFound()`. |
| Duplicate content | ✅ | None detected. |
| `llms.txt` | ❌ | Says "hardcoded demonstration data … not connected in this UI prototype" — outdated and inaccurate. Rewrite. |
| Branding | ⚠️ | "VerifedDB" is misspelled relative to "Verified", which hurts brand search; also see F-35. |
