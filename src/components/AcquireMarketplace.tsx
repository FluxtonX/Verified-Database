"use client";

/* eslint-disable @next/next/no-img-element */
import type { SponsorCatalog, SponsorPrice } from "@/lib/sponsorship";
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import Link from "next/link";
import { Icon } from "./icons";
import SponsorPanel from "./SponsorPanel";
import { SiteCta, SiteFooter, SiteHeader } from "./SiteChrome";
import { compactMoney, median } from "@/lib/format";
import MarketplaceListingCard from "./MarketplaceListingCard";
import AddStartupModal from "./AddStartupModal";
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

export default function AcquireMarketplace({ listings, configured, failed, categories, signedIn, openSubmission, sponsors, sponsorPrice, sponsorCheckout, savedIds = [], ownedIds = [], buyerReady = false, buyerActivityFailed = false }: {
  savedIds?: string[];
  ownedIds?: string[];
  buyerReady?: boolean;
  buyerActivityFailed?: boolean;
  listings: Startup[] | null;
  configured: boolean;
  failed: boolean;
  categories: string[];
  signedIn: boolean;
  openSubmission: boolean;
  sponsors: SponsorCatalog | null;
  sponsorPrice: SponsorPrice | null;
  sponsorCheckout: boolean;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
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

  const medianMultiple = median(source.flatMap(startup => startup.multiple ?? []));
  const openSell = (event: ReactMouseEvent<HTMLButtonElement>) => {
    sellButtonRef.current = event.currentTarget;
    setShowModal(true);
  };
  const resetFilters = () => { setQuery(""); setCategory("Select categories..."); setRanges({}); setSelections({}); setSort("default"); setLimit(24); };

  return <div className="acquire-root">
    <SiteHeader signedIn={signedIn} current="marketplace" onList={openSell} next="/acquire" />
    <main className="acquire-main">
      <header className="acquire-hero">
        <div className="acquire-hero-copy">
          <span className="eyebrow-pill"><span className="live-dot" />Acquisition marketplace</span>
          <h1>Startups for sale.<br /><em>Numbers from the source.</em></h1>
          <p>Browse SaaS, apps and digital businesses with revenue pulled from Stripe or RevenueCat. Message founders directly and run the deal your way.</p>
          <div className="hero-actions">
            <label className="search-box"><Icon name="search" size={18} /><input aria-label="Search marketplace startups" placeholder="Search by name, niche or category" value={query} onChange={e => setQuery(e.target.value)} /></label>
            <button type="button" className="add-startup" onClick={openSell}><Icon name="plus" size={18} />Sell your startup</button>
          </div>
        </div>
        <dl className="acquire-stats" aria-label="Marketplace snapshot">
          <div><dt>Listings</dt><dd>{source.length}</dd></div>
          <div><dt>Monthly revenue</dt><dd>{compactMoney(source.reduce((sum, startup) => sum + startup.revenue, 0))}<small>/mo</small></dd></div>
          <div><dt>Median multiple</dt><dd>{medianMultiple === null ? "—" : `${medianMultiple.toFixed(1)}x`}</dd></div>
        </dl>
        {!configured && <p className="acquire-sample">Sample listings · connect Supabase to show live startups.</p>}
      </header>

      <div className="marketplace-layout">
        <aside className="marketplace-filters" aria-label="Marketplace filters"><div className="marketplace-filter-heading"><h2>Refine your search</h2><button type="button" className="seller-button marketplace-filter-toggle" aria-expanded={filtersOpen} aria-controls="marketplace-filter-panel" onClick={() => setFiltersOpen(!filtersOpen)}><Icon name="filter" size={16} />Filters</button><button className="text-link" type="button" onClick={resetFilters}>Reset</button></div><div id="marketplace-filter-panel" className={`marketplace-filter-panel${filtersOpen ? " filters-open" : ""}`}>
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
        {buyerActivityFailed && <p role="alert">Couldn’t load your saved startups. Refresh to try again.</p>}
        {failed && <p role="alert">Some marketplace data is temporarily unavailable.</p>}
        <div className="marketplace-card-grid">{startups.slice(0, limit).map(startup => <MarketplaceListingCard startup={startup} key={startup.id} saved={savedIds.includes(startup.id)} owned={ownedIds.includes(startup.id)} signedIn={signedIn} ready={buyerReady} sample={!configured} />)}</div>
        {!startups.length && !failed && <p className="marketplace-empty">{source.length ? "No startups match these filters." : "No startups are listed yet. Founders who list now get seen first."}</p>}
        {startups.length > limit && <div className="load-more"><button onClick={() => setLimit(limit + 24)}>Show more</button></div>}
        {!signedIn && <section className="marketplace-locked" aria-labelledby="marketplace-gate-title">
          <div className="marketplace-card-grid locked-card-grid" aria-hidden="true" inert>{demoListings.slice(0, 4).map((startup, index) => <MarketplaceListingCard key={startup.id} sample startup={{ ...startup, name: ["Get Founders", "Unnamed Company", "Figmentor", "Private Startup"][index], featured: index === 0 }} />)}</div>
          <div className="marketplace-gate"><span className="marketplace-lock"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><rect x="3" y="10" width="18" height="12" rx="2" /><path d="M7 10V6a5 5 0 0 1 10 0v4" /></svg></span><h2 id="marketplace-gate-title">Browse the full marketplace</h2><p>Create a free account to see all available listings.</p><Link href="/login?next=%2Facquire" className="marketplace-account-link">Create free account</Link><Link href="/#how-it-works" className="marketplace-affiliate-link">How buying works <span>→</span></Link></div>
        </section>}
        {!configured && <FounderTestimonials />}
        </div>
        <div className="marketplace-sponsors">
          <SponsorPanel catalog={sponsors} price={sponsorPrice} enabled={sponsorCheckout} placement="marketplace" />
        </div>
      </div>
      <SiteCta onList={openSell}
        title={<>Ready to sell? <em>Buyers are browsing.</em></>}
        text="List with revenue from your payment provider. Stay anonymous until you choose to share the details."
        secondary={{ href: "/#how-it-works", label: "How it works" }} />
    </main>
    <SiteFooter />
    {showModal && <AddStartupModal triggerRef={sellButtonRef} onClose={() => setShowModal(false)} signedIn={signedIn} next="/acquire?submit=1" />}
  </div>;
}
