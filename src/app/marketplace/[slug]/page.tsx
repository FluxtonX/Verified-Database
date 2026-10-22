import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import RevenueBar from "@/components/RevenueBar";
import OfferPanel from "@/components/OfferPanel";
import { REVENUE_TYPES, formatMoney, pct, totalRevenue } from "@/data/startups";
import { LISTINGS, getListing, margin, profitMultiple, type Listing } from "@/data/listings";
import { getStartupById } from "@/lib/db";

export async function generateStaticParams() {
  return LISTINGS.map((l) => ({ slug: l.id }));
}

async function resolveListing(slug: string): Promise<Listing | undefined> {
  const staticItem = getListing(slug);
  if (staticItem) return staticItem;
  try {
    const dbItem = await getStartupById(slug);
    if (dbItem && dbItem.isForSale) {
      return {
        id: dbItem.id,
        name: dbItem.name,
        logo: dbItem.logo,
        category: dbItem.category,
        tagline: dbItem.tagline,
        founded: dbItem.founded,
        hq: dbItem.hq,
        how: dbItem.how,
        revenue: dbItem.revenue,
        profit: dbItem.profit ?? 0.1,
        askingPrice: dbItem.askingPrice ?? 0.5,
        verified: dbItem.verified,
        teamSize: dbItem.teamSize ?? 1,
        stack: dbItem.stack ?? ["Next.js", "TypeScript"],
        reason: dbItem.reason ?? "Founder moving on to new venture.",
        includes: dbItem.includes ?? ["Source code & assets", "Domain transfer", "Founder handover"],
        listedDaysAgo: 1,
        growthYoY: 0.25,
      };
    }
  } catch (err) {
    console.warn("DB lookup error:", err);
  }
  return undefined;
}

export async function generateMetadata({
  params,
}: PageProps<"/marketplace/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const l = await resolveListing(slug);
  if (!l) return { title: "Listing not found — TrustLedger" };
  return {
    title: `${l.name} is for sale — TrustLedger`,
    description: `${l.name}: ${l.tagline}. Revenue ${formatMoney(totalRevenue(l))} a year, asking ${formatMoney(l.askingPrice)}.`,
  };
}

export default async function ListingPage({ params }: PageProps<"/marketplace/[slug]">) {
  const { slug } = await params;
  const l = await resolveListing(slug);
  if (!l) notFound();

  const total = totalRevenue(l);
  const similar = LISTINGS.filter((o) => o.id !== l.id)
    .sort((a, b) => Number(b.category === l.category) - Number(a.category === l.category))
    .slice(0, 3);

  return (
    <>
      <SiteHeader />
      <main className="detail wrap">
        <Link href="/marketplace" className="back">
          ← All startups for sale
        </Link>

        <section className="d-hero">
          <div className="d-id">
            <span className="logo-badge big">{l.logo}</span>
            <div>
              <h1>{l.name}</h1>
              <p className="d-tag">{l.tagline}</p>
              <p className="d-meta">
                {l.category} · Founded {l.founded} · {l.hq} · Listed {l.listedDaysAgo} day
                {l.listedDaysAgo === 1 ? "" : "s"} ago
              </p>
            </div>
          </div>
          <span className={`vbadge big ${l.verified ? "ok" : "self"}`}>
            {l.verified ? "✓ Revenue verified" : "Self-reported revenue"}
          </span>
        </section>

        <div className="l-layout">
          <div className="l-main">
            <section className="panel">
              <h2>The numbers at a glance</h2>
              <dl className="kpis">
                <div>
                  <dt>Revenue / year</dt>
                  <dd>{formatMoney(total)}</dd>
                </div>
                <div>
                  <dt>Profit / year</dt>
                  <dd>{formatMoney(l.profit)}</dd>
                </div>
                <div>
                  <dt>Profit margin</dt>
                  <dd>{pct(margin(l))}%</dd>
                </div>
                <div>
                  <dt>Price vs profit</dt>
                  <dd>{profitMultiple(l).toFixed(1)}×</dd>
                </div>
                <div>
                  <dt>Growth vs last year</dt>
                  <dd className={l.growthYoY < 0 ? "neg" : "pos"}>
                    {l.growthYoY < 0 ? "▼" : "▲"} {Math.abs(pct(l.growthYoY))}%
                  </dd>
                </div>
                <div>
                  <dt>Team size</dt>
                  <dd>{l.teamSize}</dd>
                </div>
              </dl>
              <p className="explain">
                <b>Price vs profit</b> means how many years of profit you pay upfront. {profitMultiple(l).toFixed(1)}× means
                you would earn the price back in about {profitMultiple(l).toFixed(1)} years if profit stays the same.
              </p>
            </section>

            <section className="panel">
              <h2>Where the money comes from</h2>
              <p className="sub">{l.how}</p>
              <RevenueBar startup={l} tall />
              <ul className="mix">
                {REVENUE_TYPES.filter((t) => l.revenue[t.id])
                  .sort((a, b) => (l.revenue[b.id] ?? 0) - (l.revenue[a.id] ?? 0))
                  .map((t) => {
                    const v = l.revenue[t.id] ?? 0;
                    return (
                      <li key={t.id}>
                        <i className="dot" style={{ background: t.color }} />
                        <span className="mix-name">
                          {t.icon} {t.label}
                          <small>{t.explain}</small>
                        </span>
                        <span className="mix-val">
                          {formatMoney(v)}
                          <small>{pct(v / total)}% of total</small>
                        </span>
                      </li>
                    );
                  })}
              </ul>
            </section>

            <section className="panel">
              <h2>What you get</h2>
              <ul className="ticks">
                {l.includes.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
              <h3 className="h3-sp">Built with</h3>
              <div className="tags">
                {l.stack.map((s) => (
                  <span key={s} className="tag">
                    {s}
                  </span>
                ))}
              </div>
            </section>

            <section className="panel">
              <h2>Why the owner is selling</h2>
              <p className="sub">{l.reason}</p>
            </section>

            <section className="panel verify">
              <h2>Can I trust these numbers?</h2>
              {l.verified ? (
                <p className="sub">
                  Yes, this seller connected their payment account and the figures come straight
                  from it. The seller cannot edit them. (Demo: real connections arrive with the
                  backend.)
                </p>
              ) : (
                <p className="sub">
                  Not yet. These numbers were typed in by the seller and have not been checked. Ask
                  the seller to connect their accounts, or request screenshots and bank
                  statements before you make a serious offer.
                </p>
              )}
            </section>
          </div>

          <OfferPanel listingId={l.id} listingName={l.name} askingDollars={Math.round(l.askingPrice * 1_000_000)} />
        </div>

        <section className="panel flat">
          <h2>Other startups for sale</h2>
          <div className="peers">
            {similar.map((o) => (
              <Link key={o.id} href={`/marketplace/${o.id}`} className="peer-card">
                <span className="logo-badge">{o.logo}</span>
                <span>
                  <strong>{o.name}</strong>
                  <small>
                    Asking {formatMoney(o.askingPrice)} · {o.category}
                  </small>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
