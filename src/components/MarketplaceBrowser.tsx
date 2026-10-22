"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import RevenueBar from "@/components/RevenueBar";
import { REVENUE_TYPES, formatMoney, totalRevenue, type RevenueTypeId } from "@/data/startups";
import { LISTINGS, margin, profitMultiple, type Listing } from "@/data/listings";
import { useStored, MY_STARTUPS_KEY, DEFAULT_MY_STARTUPS, type UserStartup } from "@/lib/storage";

type Sort = "newest" | "price-low" | "price-high" | "revenue" | "multiple";

export default function MarketplaceBrowser() {
  const [userStartups] = useStored<UserStartup>(MY_STARTUPS_KEY, DEFAULT_MY_STARTUPS);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [type, setType] = useState<RevenueTypeId | "all">("all");
  const [maxPrice, setMaxPrice] = useState(0);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("newest");

  const combinedListings = useMemo(() => {
    const userForSale: Listing[] = userStartups
      .filter((u) => u.isForSale)
      .map((u) => ({
        id: u.id,
        name: u.name,
        logo: u.logo,
        category: u.category,
        tagline: u.tagline,
        founded: u.founded,
        hq: u.hq,
        how: u.how,
        revenue: u.revenue,
        profit: u.profit ?? 0.1,
        askingPrice: u.askingPrice ?? 0.5,
        verified: u.verified,
        teamSize: u.teamSize ?? 1,
        stack: u.stack ?? ["Next.js", "TypeScript"],
        reason: u.reason ?? "Founder moving on to new venture.",
        includes: u.includes ?? ["Source code & assets", "Domain transfer"],
        listedDaysAgo: 0,
        growthYoY: 0.2,
      }));

    const existingIds = new Set(LISTINGS.map((l) => l.id));
    const newItems = userForSale.filter((u) => !existingIds.has(u.id));
    return [...newItems, ...LISTINGS];
  }, [userStartups]);

  const categories = useMemo(() => {
    return Array.from(new Set(combinedListings.map((l) => l.category))).sort();
  }, [combinedListings]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return combinedListings.filter((l) => {
      if (category !== "all" && l.category !== category) return false;
      if (type !== "all" && !l.revenue[type]) return false;
      if (maxPrice && l.askingPrice > maxPrice) return false;
      if (verifiedOnly && !l.verified) return false;
      if (!q) return true;
      return (
        l.name.toLowerCase().includes(q) ||
        l.tagline.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q)
      );
    }).sort((a, b) => {
      switch (sort) {
        case "price-low":
          return a.askingPrice - b.askingPrice;
        case "price-high":
          return b.askingPrice - a.askingPrice;
        case "revenue":
          return totalRevenue(b) - totalRevenue(a);
        case "multiple":
          return profitMultiple(a) - profitMultiple(b);
        default:
          return a.listedDaysAgo - b.listedDaysAgo;
      }
    });
  }, [combinedListings, query, category, type, maxPrice, verifiedOnly, sort]);

  const reset = () => {
    setQuery("");
    setCategory("all");
    setType("all");
    setMaxPrice(0);
    setVerifiedOnly(false);
  };

  const filtersOn = query || category !== "all" || type !== "all" || maxPrice || verifiedOnly;

  return (
    <section className="section" id="listings">
      <div className="wrap">
        <div className="filters">
          <div className="search search-sm">
            <span aria-hidden>🔎</span>
            <input
              aria-label="Search startups for sale"
              placeholder="Search startups for sale…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <label className="field">
            <span>Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Asking price</span>
            <select value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))}>
              <option value={0}>Any price</option>
              <option value={0.5}>Up to $500K</option>
              <option value={1}>Up to $1M</option>
              <option value={2}>Up to $2M</option>
            </select>
          </label>

          <label className="field">
            <span>Sort by</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="newest">Newest</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              <option value="revenue">Highest revenue</option>
              <option value="multiple">Best value (lowest price vs profit)</option>
            </select>
          </label>
        </div>

        <div className="chips" role="group" aria-label="Filter by how it earns">
          <span className="chips-label">Earns from:</span>
          <button className={`chip ${type === "all" ? "on" : ""}`} onClick={() => setType("all")}>
            Anything
          </button>
          {REVENUE_TYPES.map((t) => (
            <button
              key={t.id}
              className={`chip ${type === t.id ? "on" : ""}`}
              style={{ ["--c" as string]: t.color, ["--on" as string]: "#fff" }}
              onClick={() => setType(t.id)}
            >
              <i className="dot" />
              {t.label}
            </button>
          ))}
          <label className="check">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
            />
            Verified revenue only
          </label>
        </div>

        <p className="count">
          {list.length} startup{list.length === 1 ? "" : "s"} for sale
          {filtersOn ? (
            <>
              {" · "}
              <button className="link" onClick={reset}>
                Clear filters
              </button>
            </>
          ) : null}
        </p>

        {list.length === 0 ? (
          <div className="empty">
            Nothing matches those filters.{" "}
            <button className="link" onClick={reset}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="lgrid">
            {list.map((l) => (
              <Link key={l.id} href={`/marketplace/${l.id}`} className="lcard">
                <div className="lc-top">
                  <span className="logo-badge">{l.logo}</span>
                  <div>
                    <strong>{l.name}</strong>
                    <small>{l.category}</small>
                  </div>
                  <span className={`vbadge ${l.verified ? "ok" : "self"}`}>
                    {l.verified ? "✓ Verified" : "Self-reported"}
                  </span>
                </div>
                <p className="lc-tag">{l.tagline}</p>
                <div className="lc-price">
                  <span>Asking price</span>
                  <strong>{formatMoney(l.askingPrice)}</strong>
                </div>
                <dl className="lc-stats">
                  <div>
                    <dt>Revenue / year</dt>
                    <dd>{formatMoney(totalRevenue(l))}</dd>
                  </div>
                  <div>
                    <dt>Profit / year</dt>
                    <dd>{formatMoney(l.profit)}</dd>
                  </div>
                  <div>
                    <dt>Price vs profit</dt>
                    <dd>{profitMultiple(l).toFixed(1)}×</dd>
                  </div>
                  <div>
                    <dt>Profit margin</dt>
                    <dd>{Math.round(margin(l) * 100)}%</dd>
                  </div>
                </dl>
                <RevenueBar startup={l} />
                <span className="lc-foot">
                  Listed {l.listedDaysAgo} day{l.listedDaysAgo === 1 ? "" : "s"} ago
                  <b>View details →</b>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
