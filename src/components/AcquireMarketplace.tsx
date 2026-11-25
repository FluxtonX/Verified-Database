"use client";

import type { SponsorCatalog, SponsorPrice } from "@/lib/sponsorship";
import { useEffect, useRef, useState, useTransition, type MouseEvent as ReactMouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "./icons";
import SponsorPanel from "./SponsorPanel";
import { SiteCta, SiteFooter, SiteHeader } from "./SiteChrome";
import { compactMoney, median } from "@/lib/format";
import MarketplaceListingCard from "./MarketplaceListingCard";
import AddStartupModal from "./AddStartupModal";
import { activeFilterCount, emptyFilters, filtersToSearch, marketplaceSorts, pageSize, type MarketplaceFilters } from "@/lib/marketplace-filters";
import type { MarketplaceCardData as Startup } from "@/lib/catalog";

// Fixed names (not Intl.DisplayNames) so server and browser render identical text.
const countries: [string, string][] = [
  ["AU", "Australia"], ["BR", "Brazil"], ["CA", "Canada"], ["FR", "France"], ["DE", "Germany"], ["IN", "India"],
  ["IT", "Italy"], ["NL", "Netherlands"], ["PK", "Pakistan"], ["SG", "Singapore"], ["ES", "Spain"], ["SE", "Sweden"],
  ["AE", "United Arab Emirates"], ["GB", "United Kingdom"], ["US", "United States"],
];

type Range = ["revenueMin" | "mrrMin" | "growthMin" | "priceMin" | "marginMin", "revenueMax" | "mrrMax" | "growthMax" | "priceMax" | "marginMax"];
type Update = (patch: Partial<MarketplaceFilters>, debounce?: boolean) => void;

function RangeField({ label, keys: [min, max], percentage, draft, update, info }: {
  label: string; keys: Range; percentage?: boolean; draft: MarketplaceFilters; update: Update; info?: string;
}) {
  return <fieldset className="marketplace-filter-field"><legend>{label}{info && <span title={info} className="marketplace-filter-info">ⓘ</span>}</legend><div className="marketplace-range">
    <input type="number" inputMode="decimal" aria-label={`Minimum ${label}`} placeholder={percentage ? "Min %" : "$ Min"} value={draft[min]} onChange={e => update({ [min]: e.target.value }, true)} />
    <span>-</span><input type="number" inputMode="decimal" aria-label={`Maximum ${label}`} placeholder={percentage ? "Max %" : "$ Max"} value={draft[max]} onChange={e => update({ [max]: e.target.value }, true)} />
  </div></fieldset>;
}

function FilterSelect({ label, options, value, onChange, className = "" }: {
  label: string; options: [string, string][]; value: string; onChange: (value: string) => void; className?: string;
}) {
  return <label className={`marketplace-filter-field ${className}`}><span>{label}</span><span className="marketplace-select">
    <select value={value} onChange={e => onChange(e.target.value)}>{options.map(([optionValue, text]) => <option key={optionValue} value={optionValue}>{text}</option>)}</select>
  </span></label>;
}

export default function AcquireMarketplace({ filters, listings, total, stats, configured, failed, categories, signedIn, openSubmission, sponsors, sponsorPrice, sponsorCheckout, savedIds = [], ownedIds = [], buyerReady = false, buyerActivityFailed = false }: {
  filters: MarketplaceFilters;
  listings: Startup[];
  total: number;
  stats: { listings: number; revenue: number; multiples: number[] } | null;
  savedIds?: string[];
  ownedIds?: string[];
  buyerReady?: boolean;
  buyerActivityFailed?: boolean;
  configured: boolean;
  failed: boolean;
  categories: string[];
  signedIn: boolean;
  openSubmission: boolean;
  sponsors: SponsorCatalog | null;
  sponsorPrice: SponsorPrice | null;
  sponsorCheckout: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showModal, setShowModal] = useState(openSubmission);
  const sellButtonRef = useRef<HTMLButtonElement>(null);
  const sortRef = useRef<HTMLDetailsElement>(null);
  const timer = useRef<number | undefined>(undefined);

  // The URL is the source of truth. Follow it when it changes (back/forward, pagination links).
  const applied = filtersToSearch(filters);
  const [draft, setDraft] = useState(filters);
  const [syncedFrom, setSyncedFrom] = useState(applied);
  if (syncedFrom !== applied) {
    setSyncedFrom(applied);
    setDraft(filters);
  }

  useEffect(() => {
    const closeSort = (event: MouseEvent) => { if (!sortRef.current?.contains(event.target as Node)) sortRef.current?.removeAttribute("open"); };
    const escapeSort = (event: KeyboardEvent) => { if (event.key === "Escape") { sortRef.current?.removeAttribute("open"); sortRef.current?.querySelector("summary")?.focus(); } };
    document.addEventListener("click", closeSort);
    document.addEventListener("keydown", escapeSort);
    return () => { document.removeEventListener("click", closeSort); document.removeEventListener("keydown", escapeSort); window.clearTimeout(timer.current); };
  }, []);

  const navigate = (next: MarketplaceFilters) => startTransition(() => router.replace(`/acquire${filtersToSearch(next)}`, { scroll: false }));
  const update: Update = (patch, debounce = false) => {
    const next = { ...draft, ...patch, page: 1 };
    setDraft(next);
    window.clearTimeout(timer.current);
    if (debounce) timer.current = window.setTimeout(() => navigate(next), 450);
    else navigate(next);
  };

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = total ? (filters.page - 1) * pageSize + 1 : 0;
  const last = Math.min(total, filters.page * pageSize);
  const pageHref = (page: number) => `/acquire${filtersToSearch({ ...filters, page })}`;
  const filterCount = activeFilterCount(filters);
  const medianMultiple = median(stats?.multiples ?? []);
  const openSell = (event: ReactMouseEvent<HTMLButtonElement>) => {
    sellButtonRef.current = event.currentTarget;
    setShowModal(true);
  };

  return <div className="acquire-root">
    <SiteHeader signedIn={signedIn} current="marketplace" onList={openSell} next="/acquire" />
    <main className="acquire-main">
      <header className="acquire-hero">
        <div className="acquire-hero-copy">
          <span className="eyebrow-pill"><span className="live-dot" />Acquisition marketplace</span>
          <h1>Startups for sale.<br /><em>Numbers from the source.</em></h1>
          <p>Browse SaaS, apps and digital businesses with revenue pulled from Stripe or RevenueCat. Message founders directly and run the deal your way.</p>
          <form className="hero-actions" role="search" onSubmit={event => { event.preventDefault(); window.clearTimeout(timer.current); navigate({ ...draft, page: 1 }); }}>
            <label className="search-box"><Icon name="search" size={18} /><input aria-label="Search marketplace startups" placeholder="Search by name, niche or category" value={draft.q} maxLength={100} onChange={e => update({ q: e.target.value }, true)} /></label>
            <button type="button" className="add-startup" onClick={openSell}><Icon name="plus" size={18} />Sell your startup</button>
          </form>
        </div>
        <dl className="acquire-stats" aria-label="Marketplace snapshot">
          <div><dt>Listings</dt><dd>{stats?.listings ?? "—"}</dd></div>
          <div><dt>Monthly revenue</dt><dd>{stats ? compactMoney(stats.revenue) : "—"}<small>/mo</small></dd></div>
          <div><dt>Median multiple</dt><dd>{medianMultiple === null ? "—" : `${medianMultiple.toFixed(1)}x`}</dd></div>
        </dl>
        {!configured && <p className="acquire-sample">Sample listings · connect Supabase to show live startups.</p>}
      </header>

      <div className="marketplace-layout">
        <aside className="marketplace-filters" aria-label="Marketplace filters">
          <div className="marketplace-filter-heading">
            <h2>Refine your search</h2>
            <button type="button" className="seller-button marketplace-filter-toggle" aria-expanded={filtersOpen} aria-controls="marketplace-filter-panel" onClick={() => setFiltersOpen(!filtersOpen)}>
              <Icon name="filter" size={16} />Filters{filterCount > 0 && ` (${filterCount})`}
            </button>
            <button className="text-link" type="button" onClick={() => { window.clearTimeout(timer.current); setDraft(emptyFilters); navigate(emptyFilters); }}>Reset</button>
          </div>
          <div id="marketplace-filter-panel" className={`marketplace-filter-panel${filtersOpen ? " filters-open" : ""}`}>
            <FilterSelect label="Category" options={[["", "All categories"], ...categories.map(name => [name, name] as [string, string])]} value={draft.category} onChange={category => update({ category })} />
            <RangeField label="Revenue (last 30 days)" keys={["revenueMin", "revenueMax"]} draft={draft} update={update} />
            <RangeField label="MRR" keys={["mrrMin", "mrrMax"]} draft={draft} update={update} />
            <RangeField label="Growth (last 30 days)" keys={["growthMin", "growthMax"]} percentage draft={draft} update={update} />
            <RangeField label="Asking price" keys={["priceMin", "priceMax"]} draft={draft} update={update} />
            <FilterSelect label="Max multiple" options={[["", "Any multiple"], ["1", "1x"], ["2", "2x"], ["3", "3x"], ["5", "5x"], ["10", "10x"]]} value={draft.maxMultiple} onChange={maxMultiple => update({ maxMultiple })} />
            <RangeField label="Profit margin" keys={["marginMin", "marginMax"]} percentage draft={draft} update={update} info="Self-reported by founders." />
            <FilterSelect label="Audience" options={[["", "Any"], ["B2B", "B2B"], ["B2C", "B2C"]]} value={draft.audience} onChange={audience => update({ audience: audience as MarketplaceFilters["audience"] })} />
            <FilterSelect label="Mobile app" options={[["", "Any"], ["yes", "Yes"], ["no", "No"]]} value={draft.mobile} onChange={mobile => update({ mobile: mobile as MarketplaceFilters["mobile"] })} />
            <FilterSelect label="Listed" options={[["", "Any time"], ["7", "Last 7 days"], ["30", "Last 30 days"], ["90", "Last 90 days"]]} value={draft.listed} onChange={listed => update({ listed: listed as MarketplaceFilters["listed"] })} />
            <fieldset className="marketplace-filter-field"><legend>Founded</legend>
              {(["foundedFrom", "foundedTo"] as const).map(bound => <label className="marketplace-date-field" key={bound}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M4 10h16M8 3v4m8-4v4" /></svg>
                <input type="date" value={draft[bound]} onChange={event => update({ [bound]: event.target.value })} aria-label={`Founded ${bound === "foundedFrom" ? "from" : "to"}`} />
              </label>)}
            </fieldset>
            <FilterSelect label="Country" className="marketplace-country" options={[["", "All countries"], ...countries]} value={draft.country} onChange={country => update({ country })} />
          </div>
        </aside>

        <div className="marketplace-results" aria-busy={pending}>
          <div className="marketplace-results-toolbar">
            <p aria-live="polite">{pending ? "Updating…" : total ? `${first}–${last} of ${total} startup${total === 1 ? "" : "s"}` : "0 startups found"}</p>
            <details className="marketplace-sort" ref={sortRef}><summary>{marketplaceSorts.find(option => option[0] === draft.sort)?.[1]}<span className="select-chevron" /></summary>
              <div className="marketplace-sort-options">{marketplaceSorts.map(([value, label]) => <button key={value} type="button" onClick={() => { update({ sort: value }); sortRef.current?.removeAttribute("open"); }} className={draft.sort === value ? "selected" : ""}>{label}{draft.sort === value && <span>✓</span>}</button>)}</div>
            </details>
          </div>
          {buyerActivityFailed && <p role="alert">Couldn’t load your saved startups. Refresh to try again.</p>}
          {failed && <p role="alert">Some marketplace data is temporarily unavailable.</p>}
          <div className={`marketplace-card-grid${pending ? " is-pending" : ""}`}>{listings.map(startup => <MarketplaceListingCard startup={startup} key={startup.id} saved={savedIds.includes(startup.id)} owned={ownedIds.includes(startup.id)} signedIn={signedIn} ready={buyerReady} sample={!configured} />)}</div>
          {!listings.length && !failed && <p className="marketplace-empty">{stats?.listings ? "No startups match these filters." : "No startups are listed yet. Founders who list now get seen first."}</p>}
          {pages > 1 && <nav className="marketplace-pages" aria-label="Pages">
            {filters.page > 1 ? <Link className="seller-button" href={pageHref(filters.page - 1)} rel="prev">← Previous</Link> : <span />}
            <span className="muted">Page {filters.page} of {pages}</span>
            {filters.page < pages ? <Link className="seller-button" href={pageHref(filters.page + 1)} rel="next">Next →</Link> : <span />}
          </nav>}
          {!signedIn && configured && <section className="marketplace-join" aria-labelledby="marketplace-join-title">
            <span className="marketplace-lock" aria-hidden="true"><Icon name="heart" size={22} /></span>
            <div>
              <h2 id="marketplace-join-title">Found one you like?</h2>
              <p>Create a free account to save startups, message founders and send acquisition inquiries.</p>
            </div>
            <Link href="/login?next=%2Facquire" className="marketplace-account-link">Create free account</Link>
          </section>}
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
