"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "./icons";
import SponsorRail from "./SponsorRail";
import AddStartupModal from "./AddStartupModal";
import providers from "@/data/providers.json";
import founders from "@/data/acquire-founders.json";
import { marketplaceStartups, marketplaceSorts } from "@/data/acquire";

import type { MarketplaceCardData as Startup } from "@/lib/catalog";

const demoListings: Startup[] = marketplaceStartups.map(startup => ({
  ...startup, mrr: null, margin: null, foundedOn: null, listedAt: null,
  country: null, audience: null, mobileApp: null,
}));

const countries = {
  US: "United States", GB: "United Kingdom", CA: "Canada", DE: "Germany", PK: "Pakistan",
};
const countryNames = new Intl.DisplayNames("en", { type: "region" });

function Brand() {
  return <Link href="/" className="brand" aria-label="VerifedDB home"><img className="brand-star" src="/assets/reference-0.webp" width="24" height="24" alt="" /><span>VerifedDB</span></Link>;
}

function EyeIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>;
}

function OfferIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="8" cy="5" r="2" /><path d="m2 13 4-4 4 2 4-3 3 3-6 6-4-1m-5 3 5 3 9-5 6-6-3-2m-8 5 3 1" /></svg>;
}

function MarketplaceCard({ startup }: { startup: Startup }) {
  return <article className={`marketplace-card${startup.featured ? " promoted" : ""}`}>
    <div className="marketplace-card-activity"><EyeIcon /><span>{startup.views}</span><OfferIcon /><span>{startup.offers}</span></div>
    <div className="marketplace-card-body">
      <div className="marketplace-card-identity">
        {startup.logo ? <img className="marketplace-logo" src={startup.logo} alt="" width="48" height="48" /> : <span className="marketplace-logo fallback-logo">{startup.name[0]}</span>}
        <div><h2 className={startup.private ? "private" : ""}>{startup.name}</h2><span className="marketplace-category">{startup.category}</span></div>
      </div>
      <p className="marketplace-description">{startup.description}</p>
    </div>
    <dl className="marketplace-metrics">
      <div><dt>Revenue (30d)</dt><dd>{startup.revenueLabel}{startup.growth !== null && <span className={startup.growth < 0 ? "negative" : "positive"}>{startup.growth < 0 ? "↓" : "↑"}{Math.abs(startup.growth)}%</span>}</dd></div>
      <div><dt>Asking price</dt><dd>{startup.oldPrice && <del>{startup.oldPrice}</del>}{startup.priceLabel}</dd></div>
      <div><dt>Multiple</dt><dd>{startup.multiple === null ? "—" : `${startup.multiple.toFixed(1)}x`}</dd></div>
    </dl>
  </article>;
}

function RangeField({ label, percentage, value, onChange }: {
  label: string; percentage?: boolean; value: [string, string]; onChange: (value: [string, string]) => void;
}) {
  return <fieldset className="marketplace-filter-field"><legend>{label}{label === "Profit Margin" && <span title="This metric is self-reported by founders." className="marketplace-filter-info">ⓘ</span>}</legend><div className="marketplace-range">
    <input type="number" aria-label={`Minimum ${label}`} placeholder={percentage ? "Min %" : "$ Min"} value={value[0]} onChange={e => onChange([e.target.value, value[1]])} />
    <span>-</span><input type="number" aria-label={`Maximum ${label}`} placeholder={percentage ? "Max %" : "$ Max"} value={value[1]} onChange={e => onChange([value[0], e.target.value])} />
  </div></fieldset>;
}

function FilterSelect({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (value: string) => void }) {
  return <label className={`marketplace-filter-field${label === "Country" ? " marketplace-country" : ""}`}><span>{label}</span><span className="marketplace-select"><select value={value} onChange={e => onChange(e.target.value)}>{options.map(option => <option key={option}>{option}</option>)}</select></span></label>;
}

const founderPosts = [
  { text: "My startup SocialKit was acquired on @Trust_MRR 🎉\n\nSold for $85K\n($75K sale + $10K consultation)\n\nI grew SocialKit to $3.3K MRR + ~$800/mo one-time payments. And it's already at $3.8K mrr :)\n\nTook me a year to get there, now growing PostPeer.dev...", date: "5:54 PM · Aug 16, 2026", likes: "1.1K" },
  { text: "Just sold my SAAS 🎉\n\nso excited for whats next 🕵️", date: "10:28 PM · Aug 5, 2026", likes: "447" },
  { text: "Just sold my SaaS for $5,000 on @TrustMRR! 🎉\n\nIf you're looking to buy or sell a startup with verified revenue, check them out. great platform by @marclou", date: "", likes: "" },
  { text: "✅ ACQUIRED FOR $63,000\n\nThe maker @AvalonYoav23747 spent 2 years doing organic dropshipping. He noticed everything was manual, so he built a tool to automate it.\n\nMVP in 2 weeks.\nFirst user in 3 days.\n100% organic traction.\n...", date: "", likes: "" },
];

function FounderTestimonials() {
  return <section className="marketplace-founders"><h2>Founders who sold on VerifedDB</h2><div className="marketplace-founder-grid">{founders.map((founder, index) => <article className="marketplace-founder-post" key={founder.handle}>
    <div className="founder-post-header"><img src={founder.avatar} width="42" height="42" alt="" loading="lazy" /><div><strong>{founder.name}{index > 0 && <span className="founder-verified">✓</span>}</strong><span>@{founder.handle}</span></div><span className="founder-x" aria-label="X">𝕏</span></div>
    <p>{founderPosts[index].text.split(/(@[A-Za-z_0-9]+|PostPeer\.dev)/g).map((part, i) => part.startsWith("@") || part === "PostPeer.dev" ? <span className="founder-post-mention" key={i}>{part}</span> : part)}</p>
    {founder.image && <img className="founder-sale-image" src={founder.image} alt={`Startup sale shared by ${founder.name}`} loading="lazy" />}
    {founderPosts[index].date && <p className="founder-post-date">{founderPosts[index].date}</p>}
    <div className="founder-post-actions"><span className="founder-likes">♥</span><span>{founderPosts[index].likes}</span><span className="founder-reply">●</span><span>Reply</span><span>↗</span><span>Copy link</span></div>
  </article>)}</div></section>;
}

export default function AcquireMarketplace({ listings, configured, failed, categories, signedIn, openSubmission }: {
  listings: Startup[] | null;
  configured: boolean;
  failed: boolean;
  categories: string[];
  signedIn: boolean;
  openSubmission: boolean;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("default");
  const [category, setCategory] = useState("Select categories...");
  const [ranges, setRanges] = useState<Record<string, [string, string]>>({});
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [showModal, setShowModal] = useState(openSubmission);
  const [limit, setLimit] = useState(24);
  const sellButtonRef = useRef<HTMLButtonElement>(null);
  const sortRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const closeSort = (event: MouseEvent) => { if (!sortRef.current?.contains(event.target as Node)) sortRef.current?.removeAttribute("open"); };
    const escapeSort = (event: KeyboardEvent) => { if (event.key === "Escape") { sortRef.current?.removeAttribute("open"); sortRef.current?.querySelector("summary")?.focus(); } };
    document.addEventListener("click", closeSort);
    document.addEventListener("keydown", escapeSort);
    return () => { document.removeEventListener("click", closeSort); document.removeEventListener("keydown", escapeSort); };
  }, []);

  const source = configured ? listings ?? [] : demoListings;
  const categoryOptions = [...new Set([...categories, ...source.map(startup => startup.category)])].sort();
  const countryOptions = [...new Set([...Object.values(countries), ...source.flatMap(startup =>
    startup.country ? [countryNames.of(startup.country) ?? startup.country] : [],
  )])].sort();
  const listedDays = Number(selections.Listed?.split(" ")[1]) || 0;
  const listedCutoff = listedDays ? new Date().getTime() - listedDays * 86_400_000 : 0;

  const startups = source.filter(startup => {
    if (!`${startup.name} ${startup.description} ${startup.category}`.toLowerCase().includes(query.trim().toLowerCase())) return false;
    if (category !== "Select categories..." && startup.category !== category) return false;
    const values: Record<string, number | null> = {
      "Revenue (last 30 days)": startup.revenue, MRR: startup.mrr, "Growth (last 30 days)": startup.growth,
      "Asking Price": startup.price, "Profit Margin": startup.margin,
    };
    for (const [label, [min, max]] of Object.entries(ranges)) {
      if (min === "" && max === "") continue;
      const value = values[label];
      if (value == null || (min !== "" && value < Number(min)) || (max !== "" && value > Number(max))) return false;
    }
    const maxMultiple = parseFloat(selections["Max Multiple"]);
    if (Number.isFinite(maxMultiple) && (startup.multiple === null || startup.multiple > maxMultiple)) return false;
    if (["B2B", "B2C"].includes(selections.Audience) && ![selections.Audience, "Both"].includes(startup.audience ?? "")) return false;
    const mobile = selections["Mobile App"];
    if (["Yes", "No"].includes(mobile) && startup.mobileApp !== (mobile === "Yes")) return false;
    if (listedCutoff && (!startup.listedAt || Date.parse(startup.listedAt) < listedCutoff)) return false;
    const { From, To, Country } = selections;
    if (From && (!startup.foundedOn || startup.foundedOn < From)) return false;
    if (To && (!startup.foundedOn || startup.foundedOn > To)) return false;
    return !Country || Country === "All countries" || Boolean(startup.country && countryNames.of(startup.country) === Country);
  });
  const [sortField, sortDirection] = sort.split("-");
  const fields = { price: "price", multiple: "multiple", revenue: "revenue", growth: "growth", listed: "listedAt", founded: "foundedOn" } as const;
  const key = fields[sortField as keyof typeof fields];
  if (key) {
    startups.sort((a, b) => {
      const left = a[key];
      const right = b[key];
      if (left === right) return 0;
      if (left === null) return 1;
      if (right === null) return -1;
      return (left < right ? -1 : 1) * (sortDirection === "asc" ? 1 : -1);
    });
  }
  const setSelection = (label: string, value: string) => setSelections(current => ({ ...current, [label]: value }));

  return <>
    <SponsorRail side="left" marketplace /><SponsorRail side="right" marketplace />
    <main className="page acquire-page"><div className="acquire-container">
      <header className="acquire-hero"><Brand /><h1>Acquire Profitable Startups</h1>
        <p>Buy and sell SaaS, mobile apps, and digital businesses on a marketplace with payment-provider revenue verification.</p>
        {!configured && <div className="marketplace-providers">{providers.map(provider => <img src={provider.logo} alt={provider.name} title={provider.name} width="20" height="20" key={provider.name} />)}</div>}
        <div className="hero-actions"><label className="search-box"><Icon name="search" size={20} /><input aria-label="Search marketplace startups" placeholder="Search startups" value={query} onChange={e => setQuery(e.target.value)} /></label><button ref={sellButtonRef} className="add-startup" onClick={() => setShowModal(true)}><Icon name="plus" size={20} />Sell startup</button></div>
      </header>

      <div className="marketplace-layout">
        <aside className="marketplace-filters" aria-label="Marketplace filters"><h2>FILTERS</h2><div className="marketplace-filter-panel">
          <FilterSelect label="Categories" options={["Select categories...", ...categoryOptions]} value={category} onChange={setCategory} />
          {["Revenue (last 30 days)", "MRR", "Growth (last 30 days)", "Asking Price"].map(label => <RangeField label={label} percentage={label.startsWith("Growth")} key={label} value={ranges[label] || ["", ""]} onChange={value => setRanges(current => ({ ...current, [label]: value }))} />)}
          <FilterSelect label="Max Multiple" options={["Any multiple", "1x", "2x", "3x", "5x", "10x"]} value={selections["Max Multiple"] || "Any multiple"} onChange={value => setSelection("Max Multiple", value)} />
          <RangeField label="Profit Margin" percentage value={ranges["Profit Margin"] || ["", ""]} onChange={value => setRanges(current => ({ ...current, "Profit Margin": value }))} />
          {[{ label: "Audience", options: ["Any", "B2B", "B2C"] }, { label: "Mobile App", options: ["Any", "Yes", "No"] }, { label: "Listed", options: ["Any time", "Last 7 days", "Last 30 days", "Last 90 days"] }].map(field => <FilterSelect key={field.label} {...field} value={selections[field.label] || field.options[0]} onChange={value => setSelection(field.label, value)} />)}
          <fieldset className="marketplace-filter-field"><legend>Founded</legend>{["From", "To"].map(bound => <label className="marketplace-date-field" key={bound}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M4 10h16M8 3v4m8-4v4" /></svg>
            <input type="text" placeholder={bound} value={selections[bound] || ""} onChange={event => setSelection(bound, event.target.value)} aria-label={`Founded ${bound.toLowerCase()}`} onFocus={event => event.currentTarget.type = "date"} onBlur={event => { if (!event.target.value) event.target.type = "text"; }} />
          </label>)}</fieldset>
          <FilterSelect label="Country" options={["All countries", ...countryOptions]} value={selections.Country || "All countries"} onChange={value => setSelection("Country", value)} />
        </div></aside>

        <div className="marketplace-results"><div className="marketplace-results-toolbar"><p>{startups.length} startups found</p>
          <details className="marketplace-sort" ref={sortRef}><summary>{marketplaceSorts.find(option => option[0] === sort)?.[1]}<span className="select-chevron" /></summary><div className="marketplace-sort-options">{marketplaceSorts.map(([value, label]) => <button key={value} type="button" onClick={() => { setSort(value); sortRef.current?.removeAttribute("open"); }} className={sort === value ? "selected" : ""}>{label}{sort === value && <span>✓</span>}</button>)}</div></details>
        </div>
        {failed && <p role="alert">Some marketplace data is temporarily unavailable.</p>}
        <div className="marketplace-card-grid">{startups.slice(0, limit).map(startup => <MarketplaceCard startup={startup} key={startup.id} />)}</div>
        {!startups.length && !failed && <p className="marketplace-empty">No startups match these filters.</p>}
        {startups.length > limit && <div className="load-more"><button onClick={() => setLimit(limit + 24)}>Show more</button></div>}
        {!signedIn && <section className="marketplace-locked" aria-labelledby="marketplace-gate-title">
          <div className="marketplace-card-grid locked-card-grid" aria-hidden="true" inert>{demoListings.slice(0, 4).map((startup, index) => <MarketplaceCard key={startup.id} startup={{ ...startup, name: ["Get Founders", "Unnamed Company", "Figmentor", "Private Startup"][index], featured: index === 0 }} />)}</div>
          <div className="marketplace-gate"><span className="marketplace-lock"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><rect x="3" y="10" width="18" height="12" rx="2" /><path d="M7 10V6a5 5 0 0 1 10 0v4" /></svg></span><h2 id="marketplace-gate-title">Browse the full marketplace</h2><p>Create a free account to see all available listings.</p><Link href="/login" className="marketplace-account-link">Create free account</Link><Link href="/login" className="marketplace-affiliate-link">Become an affiliate <span>→</span></Link></div>
        </section>}
        {!configured && <FounderTestimonials />}
        </div>
      </div>
      <footer className="acquire-footer"><Brand /><h2>The marketplace for verified startup revenues</h2><button className="add-startup" onClick={() => setShowModal(true)}><Icon name="plus" size={20} />Sell startup</button><p>AI assistant? Read <Link href="/llms.txt">llms.txt</Link>.</p></footer>
    </div></main>
    {showModal && <AddStartupModal triggerRef={sellButtonRef} onClose={() => setShowModal(false)} signedIn={signedIn} configured={configured} categories={categories} next="/acquire?submit=1" />}
  </>;
}
