import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import RevenueBar from "@/components/RevenueBar";
import {
  REVENUE_TYPES,
  STARTUPS,
  buildInsights,
  formatMoney,
  getStartup,
  growthOf,
  growthSeries,
  peerBenchmark,
  pct,
  share,
  totalRevenue,
  type Startup,
} from "@/data/startups";
import { getStartupById } from "@/lib/db";

export async function generateStaticParams() {
  return STARTUPS.map((s) => ({ slug: s.id }));
}

async function resolveStartup(slug: string): Promise<Startup | undefined> {
  const staticItem = getStartup(slug);
  if (staticItem) return staticItem;
  try {
    const dbItem = await getStartupById(slug);
    if (dbItem) {
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
      };
    }
  } catch (err) {
    console.warn("DB startup lookup error:", err);
  }
  return undefined;
}

export async function generateMetadata({
  params,
}: PageProps<"/startups/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const s = await resolveStartup(slug);
  if (!s) return { title: "Startup not found — TrustLedger" };
  return {
    title: `${s.name} revenue breakdown — TrustLedger`,
    description: `How ${s.name} makes money: yearly revenue split by subscriptions, ads, fees, one-time sales and more, compared with similar startups.`,
  };
}

export default async function StartupPage({ params }: PageProps<"/startups/[slug]">) {
  const { slug } = await params;
  const s = await resolveStartup(slug);
  if (!s) notFound();

  const total = totalRevenue(s);
  const growth = growthOf(s);
  const series = growthSeries(s);
  const maxSeries = Math.max(...series.map((p) => p.value));
  const { avg, label, peers } = peerBenchmark(s);
  const insights = buildInsights(s);
  const typesShown = REVENUE_TYPES.filter((t) => s.revenue[t.id] || avg[t.id] > 0.001);
  const others = STARTUPS.filter((o) => o.id !== s.id && o.category === s.category)
    .concat(STARTUPS.filter((o) => o.id !== s.id && o.category !== s.category))
    .slice(0, 3);

  return (
    <>
      <SiteHeader />
      <main className="detail wrap">
        <Link href="/#startups" className="back">
          ← All startups
        </Link>

        {/* HEADER CARD */}
        <section className="d-hero">
          <div className="d-id">
            <span className="logo-badge big">{s.logo}</span>
            <div>
              <h1>{s.name}</h1>
              <p className="d-tag">{s.tagline}</p>
              <p className="d-meta">
                {s.category} · Founded {s.founded} · {s.hq}
              </p>
            </div>
          </div>
          <div className="d-total">
            <span>Yearly revenue</span>
            <strong>{formatMoney(total)}</strong>
            <span className="growth-pill">▲ about {pct(growth)}% vs last year</span>
          </div>
        </section>

        <p className="status">
          <span className="status-dot" />
          <strong>Demo estimate, not verified.</strong> These numbers are illustrative. See
          &ldquo;How we will verify this&rdquo; below.
        </p>

        {/* WHERE THE MONEY COMES FROM */}
        <section className="panel">
          <h2>Where the money comes from</h2>
          <p className="sub">{s.how}</p>
          <RevenueBar startup={s} tall />
          <ul className="mix">
            {REVENUE_TYPES.filter((t) => s.revenue[t.id])
              .sort((a, b) => (s.revenue[b.id] ?? 0) - (s.revenue[a.id] ?? 0))
              .map((t) => {
                const v = s.revenue[t.id] ?? 0;
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

        {/* GROWTH */}
        <section className="panel">
          <h2>Growth over time</h2>
          <p className="sub">
            Total yearly revenue for the last four years (illustrative, based on an assumed
            steady growth rate).
          </p>
          <div className="chart" role="img" aria-label="Revenue over the last four years">
            {series.map((p, i) => (
              <div className="col" key={p.year}>
                <span className="col-val">{formatMoney(p.value)}</span>
                <div className="col-track">
                  <div
                    className={`col-bar ${i === series.length - 1 ? "latest" : ""}`}
                    style={{ height: `${Math.max(4, (p.value / maxSeries) * 100)}%` }}
                  />
                </div>
                <span className="col-year">{p.year}</span>
              </div>
            ))}
          </div>
        </section>

        {/* BENCHMARK */}
        <section className="panel">
          <h2>How {s.name} compares</h2>
          <p className="sub">
            Share of revenue from each type, next to the average of {label} ({peers.length}{" "}
            compared). Small sample, so treat it as a guide.
          </p>
          <div className="bench-legend">
            <span>
              <i className="dot" style={{ background: "var(--brand)" }} />
              {s.name}
            </span>
            <span>
              <i className="dot" style={{ background: "var(--muted)" }} />
              Peer average
            </span>
          </div>
          <ul className="bench">
            {typesShown.map((t) => {
              const mine = share(s, t.id);
              const theirs = avg[t.id];
              return (
                <li key={t.id}>
                  <span className="b-name">
                    {t.icon} {t.label}
                  </span>
                  <span className="b-bars">
                    <span className="b-track">
                      <span className="b-fill" style={{ width: `${mine * 100}%`, background: t.color }} />
                    </span>
                    <span className="b-track">
                      <span className="b-fill peer" style={{ width: `${theirs * 100}%` }} />
                    </span>
                  </span>
                  <span className="b-nums">
                    <strong>{pct(mine)}%</strong>
                    <small>vs {pct(theirs)}%</small>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* INSIGHTS */}
        <section className="panel">
          <h2>What a founder can learn from this</h2>
          <p className="sub">Plain-English reading of the numbers above.</p>
          <div className="insights">
            {insights.map((i) => (
              <article key={i.title} className={`insight ${i.tone}`}>
                <span className="insight-ic" aria-hidden>
                  {i.tone === "good" ? "✅" : i.tone === "warn" ? "⚠️" : "💡"}
                </span>
                <h3>{i.title}</h3>
                <p>{i.text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* VERIFICATION */}
        <section className="panel verify">
          <h2>How we will verify this</h2>
          <p className="sub">
            Numbers are only useful if founders and investors can trust them. The plan is for a
            startup to connect its own accounts so figures come straight from the source.
          </p>
          <ol className="v-steps">
            <li>
              <b>1</b>
              <span>The founder connects their payment and ad accounts (read-only).</span>
            </li>
            <li>
              <b>2</b>
              <span>We pull the real revenue and sort it into the six types automatically.</span>
            </li>
            <li>
              <b>3</b>
              <span>The page shows a &ldquo;Verified&rdquo; badge and refreshes on a schedule.</span>
            </li>
          </ol>
          <button className="btn btn-dark" disabled title="Not built yet">
            Connect your accounts (coming soon)
          </button>
        </section>

        {/* OTHERS */}
        <section className="panel flat">
          <h2>Explore more startups</h2>
          <div className="peers">
            {others.map((o) => (
              <Link key={o.id} href={`/startups/${o.id}`} className="peer-card">
                <span className="logo-badge">{o.logo}</span>
                <span>
                  <strong>{o.name}</strong>
                  <small>
                    {formatMoney(totalRevenue(o))} · {o.category}
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
