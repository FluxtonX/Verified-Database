"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import RevenueBar from "@/components/RevenueBar";
import {
  REVENUE_TYPES,
  STARTUPS,
  formatMoney,
  totalRevenue,
  type RevenueTypeId,
} from "@/data/startups";

const typeById = Object.fromEntries(REVENUE_TYPES.map((t) => [t.id, t])) as Record<
  RevenueTypeId,
  (typeof REVENUE_TYPES)[number]
>;

export default function Home() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<RevenueTypeId | "all">("all");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return STARTUPS.filter((s) => {
      if (typeFilter !== "all" && !s.revenue[typeFilter]) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.tagline.toLowerCase().includes(q)
      );
    }).sort((a, b) =>
      typeFilter === "all"
        ? totalRevenue(b) - totalRevenue(a)
        : (b.revenue[typeFilter] ?? 0) - (a.revenue[typeFilter] ?? 0),
    );
  }, [query, typeFilter]);

  const grandTotal = STARTUPS.reduce((n, s) => n + totalRevenue(s), 0);

  const jumpTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const pickType = (id: RevenueTypeId | "all") => {
    setTypeFilter(id);
    jumpTo("startups");
  };

  return (
    <>
      <SiteHeader />

      <main id="top">
        {/* HERO */}
        <section className="hero">
          <div className="wrap hero-in">
            <p className="eyebrow">A free database of startup revenue</p>
            <h1>
              See how much the world&apos;s best startups earn —{" "}
              <span className="hl">and where the money comes from.</span>
            </h1>
            <p className="lead">
              Pick any startup and instantly see its yearly revenue, split into simple
              types: subscriptions, ads, fees, one-time sales and more.
            </p>

            <div className="search">
              <span aria-hidden>🔎</span>
              <input
                aria-label="Search startups"
                placeholder="Search a startup, e.g. Canva, Stripe, Duolingo…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (e.target.value) jumpTo("startups");
                }}
              />
            </div>

            <ul className="stats">
              <li>
                <strong>{STARTUPS.length}</strong>
                <span>startups tracked</span>
              </li>
              <li>
                <strong>{formatMoney(grandTotal)}</strong>
                <span>yearly revenue combined</span>
              </li>
              <li>
                <strong>{REVENUE_TYPES.length}</strong>
                <span>revenue types explained</span>
              </li>
            </ul>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="section" id="how">
          <div className="wrap">
            <h2>How this site works</h2>
            <p className="sub">Three steps. No finance degree needed.</p>
            <ol className="steps">
              <li>
                <span className="step-n">1</span>
                <h3>Pick a startup</h3>
                <p>Browse well-known companies or search by name.</p>
              </li>
              <li>
                <span className="step-n">2</span>
                <h3>See its total revenue</h3>
                <p>That is all the money the company brings in each year.</p>
              </li>
              <li>
                <span className="step-n">3</span>
                <h3>See where it comes from</h3>
                <p>A colour bar splits the total into subscriptions, ads, fees and more.</p>
              </li>
            </ol>
          </div>
        </section>

        {/* REVENUE TYPES */}
        <section className="section section-alt" id="types">
          <div className="wrap">
            <h2>The ways startups make money</h2>
            <p className="sub">
              Not just subscriptions. Tap a type to see which startups earn from it.
            </p>
            <div className="types">
              {REVENUE_TYPES.map((t) => (
                <button
                  key={t.id}
                  className="type-card"
                  style={{ ["--c" as string]: t.color }}
                  onClick={() => pickType(t.id)}
                >
                  <span className="type-icon">{t.icon}</span>
                  <h3>{t.label}</h3>
                  <p className="type-short">{t.short}</p>
                  <p className="type-explain">{t.explain}</p>
                  <p className="type-ex">e.g. {t.example}</p>
                  <span className="type-go">See startups →</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* STARTUPS */}
        <section className="section" id="startups">
          <div className="wrap">
            <h2>Startup revenue, ranked</h2>
            <p className="sub">
              Biggest first. Each coloured bar shows how that startup&apos;s revenue is split.
              Click a row for the full story.
            </p>

            <div className="chips" role="group" aria-label="Filter by revenue type">
              <button
                className={`chip ${typeFilter === "all" ? "on" : ""}`}
                onClick={() => setTypeFilter("all")}
              >
                All revenue
              </button>
              {REVENUE_TYPES.map((t) => (
                <button
                  key={t.id}
                  className={`chip ${typeFilter === t.id ? "on" : ""}`}
                  style={{ ["--c" as string]: t.color, ["--on" as string]: "#fff" }}
                  onClick={() => setTypeFilter(t.id)}
                >
                  <i className="dot" />
                  {t.label}
                </button>
              ))}
            </div>

            <div className="legend">
              {REVENUE_TYPES.map((t) => (
                <span key={t.id}>
                  <i className="dot" style={{ background: t.color }} />
                  {t.label}
                </span>
              ))}
            </div>

            {list.length === 0 ? (
              <div className="empty">
                No startups match that search.{" "}
                <button
                  className="link"
                  onClick={() => {
                    setQuery("");
                    setTypeFilter("all");
                  }}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="rows">
                <div className="row row-head" aria-hidden>
                  <span>#</span>
                  <span>Startup</span>
                  <span className="right">
                    {typeFilter === "all" ? "Yearly revenue" : `${typeById[typeFilter].label}`}
                  </span>
                  <span>Where the money comes from</span>
                  <span />
                </div>
                {list.map((s, i) => {
                  const shown =
                    typeFilter === "all" ? totalRevenue(s) : (s.revenue[typeFilter] ?? 0);
                  return (
                    <Link key={s.id} href={`/startups/${s.id}`} className="row">
                      <span className="rank">{i + 1}</span>
                      <span className="who">
                        <span className="logo-badge">{s.logo}</span>
                        <span>
                          <strong>{s.name}</strong>
                          <small>{s.tagline}</small>
                        </span>
                      </span>
                      <span className="amount right">
                        {formatMoney(shown)}
                        <small>per year</small>
                      </span>
                      <span className="barcell">
                        <RevenueBar startup={s} />
                      </span>
                      <span className="chev" aria-hidden>
                        →
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}

            <p className="note">
              Demo data: figures are rounded, illustrative estimates to show how the site
              works, not audited numbers.
            </p>
          </div>
        </section>

        <section className="section section-alt">
          <div className="wrap cta-band">
            <div>
              <h2>Thinking of buying or selling a startup?</h2>
              <p className="sub">
                Browse small businesses for sale, with revenue broken down the same easy way.
              </p>
            </div>
            <Link className="btn btn-dark" href="/marketplace">
              Browse startups for sale →
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
