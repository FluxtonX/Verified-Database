"use client";

/* eslint-disable @next/next/no-img-element */
import type { SponsorCard, SponsorCatalog, SponsorPrice } from "@/lib/sponsorship";
import { useRef, useState, type FormEvent, type MouseEvent } from "react";
import Link from "next/link";
import { setActivityLike } from "@/app/catalog-actions";
import type { FeedRow, readHome } from "@/lib/catalog";
import data from "@/data/homepage.json";
import { Icon } from "@/components/icons";
import AddStartupModal from "@/components/AddStartupModal";
import SponsorPanel from "@/components/SponsorPanel";
import { SiteCta, SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { compactMoney, median } from "@/lib/format";
import styles from "./Home.module.css";

type Catalog = Awaited<ReturnType<typeof readHome>>;
type Listing = Catalog["recent"][number];
type Startup = Catalog["startups"][number];

const compact = { format: compactMoney };

/** Parses display amounts such as "$3,569,654", "$3.1k" or "$1.2M". */
function parseMoney(value: string) {
  const match = value.replace(/[$,\s]/g, "").match(/^(-?[\d.]+)([kKmMbB]?)$/);
  if (!match) return 0;
  const scale = { k: 1e3, m: 1e6, b: 1e9 }[match[2].toLowerCase() as "k" | "m" | "b"] ?? 1;
  return parseFloat(match[1]) * scale;
}

const demoListings = (listings: typeof data.recent): Listing[] => listings.map(listing => ({
  ...listing, id: undefined, featured: listing.name === "Penmo", multipleValue: parseFloat(listing.multiple) || null,
}));

const demoStartups = (): Startup[] => data.startups.map(startup => ({
  ...startup, includesNonrecurring: [1, 2, 8].includes(startup.rank), mrrValue: parseMoney(startup.mrr),
}));

/* Shown only when no database is connected; clearly labelled as sample content. */
const samplePosts = [
  { author: "Maya R.", project: "Inkwell", time: "2h", text: "Crossed $4k MRR this week. Annual plans are now 40% of new signups." },
  { author: "Tomás", project: "ShipNote", time: "5h", text: "Listed ShipNote today. Looking for a buyer who’ll keep the free tier alive for students." },
  { author: "Priya K.", project: "Quietly", time: "9h", text: "Founders who sold: how long was it from first message to close?\n\nTrying to plan around it." },
  { author: "Jon B.", project: "Formcat", time: "1d", text: "Shipped the Zapier integration. Churn went from 6% to 4.1% in a month." },
  { author: "Lena", project: "Tabular", time: "1d", text: "Accepted an offer. Diligence and escrow ran through a third party, and it was smoother than I expected." },
  { author: "Sam O.", project: "PingPal", time: "2d", text: "Three buyers messaged in the first 48 hours after listing. Didn’t expect that." },
];

function Logo({ name, src, className }: { name: string; src?: string; className: string }) {
  return src ? <img className={className} src={src} width="36" height="36" alt="" loading="lazy" />
    : <span className={`${className} ${styles.logoFallback}`} aria-hidden="true">{name[0]}</span>;
}

function Ticker({ listings }: { listings: Listing[] }) {
  if (!listings.length) return null;
  const row = (hidden: boolean) => <ul className={styles.tickerRow} aria-hidden={hidden || undefined}>
    {listings.map((listing, i) => <li key={`${listing.name}-${i}`}>
      <span className={styles.tickerDot} />
      <strong className={listing.private ? styles.private : undefined}>{listing.name}</strong>
      <span>{listing.revenue}/mo</span>
      <span>ask {listing.price}</span>
      <em>{listing.multiple}</em>
    </li>)}
  </ul>;
  return <div className={styles.ticker} aria-label="Recently listed startups">
    <span className={styles.tickerLabel}>Just listed</span>
    <div className={styles.tickerViewport}><div className={styles.tickerTrack}>{row(false)}{row(true)}</div></div>
  </div>;
}

function ListingCard({ listing }: { listing: Listing }) {
  return <Link href={listing.id ? `/acquire/${listing.id}` : "/acquire"} className={`${styles.listing} ${listing.featured ? styles.listingFeatured : ""}`}>
    <div className={styles.listingTop}>
      <Logo name={listing.name} src={listing.logo} className={styles.listingLogo} />
      <div className={styles.listingName}>
        <h3 className={listing.private ? styles.private : undefined}>{listing.name}</h3>
        <p>{listing.category || "Digital business"}</p>
      </div>
      <span className={styles.forSale}>For sale</span>
    </div>
    <div className={styles.listingPrice}><span>Asking</span><strong>{listing.price}</strong></div>
    <dl className={styles.listingStats}>
      <div><dt>Revenue · 30d</dt><dd>{listing.revenue}</dd></div>
      <div><dt>Multiple</dt><dd>{listing.multiple}</dd></div>
    </dl>
  </Link>;
}

function LeaderRow({ startup }: { startup: Startup }) {
  const flat = startup.growth === "—";
  return <tr>
    <td className={styles.rankCell}><span className={startup.rank <= 3 ? styles.rankTop : undefined}>{String(startup.rank).padStart(2, "0")}</span></td>
    <td>
      <div className={styles.identity}>
        <Logo name={startup.name} src={startup.logo} className={styles.rowLogo} />
        <div className={styles.identityCopy}>
          <div className={styles.identityName}>
            <span className={startup.private ? styles.private : undefined}>{startup.name}</span>
            {startup.sale && <span className={styles.forSale}>For sale</span>}
          </div>
          {startup.description && <p className={startup.private ? styles.private : undefined}>{startup.description}</p>}
        </div>
      </div>
    </td>
    <td className={styles.founderCell}>
      <div className={styles.founder}>
        {startup.avatar ? <img src={startup.avatar} width="22" height="22" alt="" loading="lazy" />
          : startup.founder !== "-" ? <span aria-hidden="true">{startup.founder[0]}</span> : null}
        <span>{startup.founder}</span>
      </div>
    </td>
    <td className={styles.mrrCell}>
      {startup.mrr}
      {startup.includesNonrecurring && <span className={styles.nonrecurring} title="Includes usage-based or one-time payments"><Icon name="warning" size={12} /></span>}
    </td>
    <td className={styles.growthCell}>
      <span className={flat ? styles.growthFlat : startup.negative ? styles.growthDown : styles.growthUp}>
        {flat ? "—" : `${startup.negative ? "▼" : "▲"} ${startup.growth}`}
      </span>
    </td>
  </tr>;
}

function SamplePost({ post }: { post: (typeof samplePosts)[number] }) {
  return <article className={styles.post}>
    <header className={styles.postHead}>
      <span className={styles.postAvatar} aria-hidden="true">{post.author[0]}</span>
      <div><strong>{post.author}</strong><span>on {post.project} · {post.time}</span></div>
    </header>
    <p className={styles.postText}>{post.text}</p>
  </article>;
}

function LivePost({ post, signedIn }: { post: FeedRow; signedIn: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  async function like() {
    setPending(true);
    try {
      setError(!await setActivityLike(post.id, !post.liked));
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }
  return <article className={styles.post} id={`update-${post.id}`}>
    <header className={styles.postHead}>
      {post.avatar ? <img className={styles.postAvatar} src={post.avatar} width="32" height="32" alt="" loading="lazy" />
        : <span className={styles.postAvatar} aria-hidden="true">{post.author[0]}</span>}
      <div>
        <strong>{post.author}</strong>
        <span>on {post.logo && <img src={post.logo} width="14" height="14" alt="" />}{post.project} · <time dateTime={post.published_at}>{post.published_at.slice(0, 10)}</time></span>
      </div>
    </header>
    <p className={styles.postText}>{post.body}</p>
    {post.image_url && <img className={styles.postImage} src={post.image_url} alt="" loading="lazy" />}
    <div className={styles.postActions}>
      {signedIn ? <button onClick={like} disabled={pending} aria-label={post.liked ? "Unlike update" : "Like update"}
        aria-pressed={post.liked} className={post.liked ? styles.liked : ""}><Icon name="heart" size={15} />{post.likes}</button>
        : <Link href="/login?next=%2F" aria-label="Log in to like this update"><Icon name="heart" size={15} />{post.likes}</Link>}
      <button aria-label="Copy update link" onClick={() => navigator.clipboard?.writeText(new URL(`/#update-${post.id}`, window.location.origin).href)}><Icon name="share" size={15} /></button>
    </div>
    {error && <p role="alert">Couldn’t update your like. Try again.</p>}
  </article>;
}

const founderSteps = [
  ["Connect a read-only key", "Import revenue straight from Stripe or RevenueCat. No screenshots, no spreadsheets."],
  ["Publish your listing", "Set your asking price, stay anonymous if you want, and go live on the marketplace."],
  ["Talk to serious buyers", "Buyers with profiles message you directly. You choose who to take forward."],
];
const buyerSteps = [
  ["Browse real numbers", "Filter by revenue, multiple, category and growth — pulled from the source."],
  ["Save and shortlist", "Build a buyer profile, save deals, and get the seller’s attention."],
  ["Close on your terms", "Run diligence, legal and escrow with the seller, using the advisors you trust."],
];

export default function Home({ catalog, signedIn, openSubmission, sponsors, sponsorPrice, sponsorCheckout, publishedSponsor }: {
  catalog: Catalog | null;
  signedIn: boolean;
  openSubmission: boolean;
  sponsors: SponsorCatalog | null;
  sponsorPrice: SponsorPrice | null;
  sponsorCheckout: boolean;
  publishedSponsor?: SponsorCard;
}) {
  const [query, setQuery] = useState("");
  const [metric, setMetric] = useState<"mrr" | "growth">("mrr");
  const [tab, setTab] = useState<"recent" | "deals">("recent");
  const [limit, setLimit] = useState(25);
  const [showAddStartup, setShowAddStartup] = useState(openSubmission);
  const trigger = useRef<HTMLButtonElement>(null);
  const sample = !catalog;

  const allStartups = catalog?.startups ?? demoStartups();
  const recent = catalog?.recent ?? demoListings(data.recent);
  const deals = catalog?.deals ?? demoListings(data.deals);

  const needle = query.trim().toLowerCase();
  const matches = (text: string) => text.toLowerCase().includes(needle);
  const startups = allStartups.filter(s => matches(`${s.name} ${s.description} ${s.founder}`));
  const growthValue = (s: Startup) => s.growth === "—" ? -Infinity : parseFloat(s.growth) * (s.negative ? -1 : 1);
  const sorted = metric === "growth" ? [...startups].sort((a, b) => growthValue(b) - growthValue(a)) : startups;
  const shownListings = (tab === "recent" ? recent : deals).filter(l => matches(`${l.name} ${l.category}`)).slice(0, 7);

  const uniqueListings = [...new Map([...recent, ...deals].map(l => [l.id ?? l.name, l])).values()];
  const medianMultiple = median(uniqueListings.flatMap(l => l.multipleValue ?? []));
  const stats = [
    { label: "Startups ranked", value: allStartups.length.toLocaleString("en-US") },
    { label: "Combined MRR", value: compact.format(allStartups.reduce((sum, s) => sum + s.mrrValue, 0)) },
    { label: "Open for offers", value: allStartups.filter(s => s.sale).length.toLocaleString("en-US") },
    { label: "Median ask", value: medianMultiple === null ? "—" : `${medianMultiple.toFixed(1)}x` },
  ];

  function openAdd(event: MouseEvent<HTMLButtonElement>) {
    trigger.current = event.currentTarget;
    setShowAddStartup(true);
  }
  function search(event: FormEvent) {
    event.preventDefault();
    document.getElementById("leaderboard")?.scrollIntoView({ behavior: "smooth" });
  }

  return <div className={styles.root}>
    <SiteHeader signedIn={signedIn} current="home" onList={openAdd} />

    <Ticker listings={recent} />

    <main id="top" className={styles.main}>
      {publishedSponsor && <p className={styles.notice} role="status">
        {publishedSponsor.name} is now live as a sponsor. <Link href="/advertise">Manage sponsorship →</Link>
      </p>}
      {catalog?.failed && <p className={styles.notice} role="alert">Some startup data is temporarily unavailable.</p>}

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.pill}><span className={styles.liveDot} />The open market for indie startups</span>
          <h1>Real revenue on the table.<br /><em>Buyers ready to talk.</em></h1>
          <p className={styles.lede}>
            Founders list with numbers pulled straight from Stripe or RevenueCat. We bring the audience —
            you meet the buyer and close the deal your way.
          </p>
          <form className={styles.searchRow} onSubmit={search} role="search">
            <label className={styles.search}>
              <Icon name="search" size={18} />
              <input aria-label="Search startups" placeholder="Search by name, niche or founder" value={query} onChange={e => setQuery(e.target.value)} />
            </label>
            <button type="button" className={styles.primary} onClick={openAdd}><Icon name="plus" size={18} />List your startup</button>
          </form>
          <ul className={styles.heroPoints}>
            <li><Icon name="check" size={14} />Read-only provider keys</li>
            <li><Icon name="check" size={14} />Stay anonymous if you want</li>
            <li><Icon name="check" size={14} />Deal directly with buyers</li>
          </ul>
        </div>

        <aside className={styles.board} aria-label="Market snapshot">
          <div className={styles.boardHead}>
            <span className={styles.eyebrow}><span className={styles.liveDot} />Market snapshot</span>
            {sample ? <span className={styles.sampleTag}>Sample data</span> : <span className={styles.boardSub}>Updated live</span>}
          </div>
          <dl className={styles.boardStats}>
            {stats.map(stat => <div key={stat.label}><dt>{stat.label}</dt><dd>{stat.value}</dd></div>)}
          </dl>
          {allStartups.length ? <ol className={styles.boardTop}>
            {allStartups.slice(0, 3).map(s => <li key={s.rank}>
              <span className={styles.boardRank}>{s.rank}</span>
              <Logo name={s.name} src={s.logo} className={styles.boardLogo} />
              <span className={`${styles.boardName} ${s.private ? styles.private : ""}`}>{s.name}</span>
              <span className={styles.boardMrr}>{compact.format(s.mrrValue)}<small>/mo</small></span>
            </li>)}
          </ol> : <div className={styles.boardEmpty}>
            <strong>The board is open.</strong>
            <p>Be one of the first founders on the leaderboard — it takes about two minutes.</p>
            <button type="button" className={styles.secondary} onClick={openAdd}>Claim a spot <Icon name="chevron" size={12} /></button>
          </div>}
          <p className={styles.boardNote}><Icon name="shield" size={13} />Figures come from each founder’s connected payment provider.</p>
        </aside>
      </section>

      <section className={styles.section} aria-labelledby="listings-heading">
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.eyebrow}>For sale</span>
            <h2 id="listings-heading">Fresh on the market</h2>
          </div>
          <div className={styles.segmented} role="tablist" aria-label="Listing view">
            <button role="tab" aria-selected={tab === "recent"} onClick={() => setTab("recent")}>Just listed</button>
            <button role="tab" aria-selected={tab === "deals"} onClick={() => setTab("deals")}>Best value this week</button>
          </div>
        </div>
        {shownListings.length ? <div className={styles.listingGrid}>
          {shownListings.map((listing, i) => <ListingCard listing={listing} key={`${listing.id ?? listing.name}-${i}`} />)}
          <Link href="/acquire" className={styles.browseCard}>
            <span>Browse the full marketplace</span>
            <span className={styles.browseArrow}><Icon name="chevron" size={16} /></span>
          </Link>
        </div> : <div className={styles.emptyCard}>
          <Icon name="building" size={26} />
          <div>
            <strong>{needle ? `No listings match “${query}”.` : tab === "deals" ? "No new deals this week yet." : "No startups listed yet."}</strong>
            <p>Founders with revenue can list in minutes and reach buyers browsing right now.</p>
          </div>
          <button type="button" className={styles.secondary} onClick={openAdd}>List your startup</button>
        </div>}
      </section>

      <section className={styles.how} id="how-it-works" aria-labelledby="how-heading">
        <div className={styles.howIntro}>
          <span className={styles.eyebrow}>How it works</span>
          <h2 id="how-heading">We make the introduction.<br /><em>You make the deal.</em></h2>
        </div>
        <div className={styles.howGrid}>
          {[["For founders", founderSteps], ["For buyers", buyerSteps]].map(([title, steps]) => <div className={styles.howCol} key={title as string}>
            <h3>{title as string}</h3>
            <ol>{(steps as string[][]).map(([head, body], i) => <li key={head}>
              <span className={styles.stepNum}>{i + 1}</span>
              <div><strong>{head}</strong><p>{body}</p></div>
            </li>)}</ol>
          </div>)}
        </div>
        <p className={styles.howNote}>
          <Icon name="shield" size={16} />
          <span><strong>A meeting place, not a middleman.</strong> VerifedDB doesn’t broker, hold funds, or run compliance checks.
          Due diligence, contracts, escrow and transfer are handled between buyer and seller and the advisors they choose.</span>
        </p>
      </section>

      <section className={styles.boardSection} id="leaderboard" aria-labelledby="leaderboard-heading">
        <div className={styles.leaderboard}>
          <div className={styles.sectionHead}>
            <div>
              <span className={styles.eyebrow}>Leaderboard</span>
              <h2 id="leaderboard-heading">Top startups by revenue</h2>
            </div>
            <div className={styles.segmented} role="group" aria-label="Sort leaderboard">
              <button aria-pressed={metric === "mrr"} onClick={() => setMetric("mrr")}>MRR</button>
              <button aria-pressed={metric === "growth"} onClick={() => setMetric("growth")}>MoM growth</button>
            </div>
          </div>
          {sample && <p className={styles.sampleNote}>Sample data · connect Supabase to show live founders.</p>}
          {sorted.length > 0 && <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th scope="col">#</th><th scope="col">Startup</th><th scope="col" className={styles.founderCell}>Founder</th><th scope="col" className={styles.alignRight}>MRR</th><th scope="col" className={styles.alignRight}>Growth</th></tr></thead>
              <tbody>{sorted.slice(0, limit).map(startup => <LeaderRow startup={startup} key={startup.rank} />)}</tbody>
            </table>
          </div>}
          {sorted.length === 0 && <p className={styles.empty}>{needle ? `No startups match “${query}”.` : "No startups on the board yet. Yours could be first."}</p>}
          {sorted.length > limit && <button className={styles.more} onClick={() => setLimit(limit + 25)}>Show {Math.min(25, sorted.length - limit)} more</button>}
        </div>
        <aside className={styles.side}>
          <SponsorPanel catalog={sponsors} price={sponsorPrice} enabled={sponsorCheckout} featured={publishedSponsor} />
        </aside>
      </section>

      <section className={styles.section} id="feed" aria-labelledby="feed-heading">
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.eyebrow}>Founder updates</span>
            <h2 id="feed-heading">Building in public</h2>
          </div>
          {sample && <span className={styles.sampleTag}>Sample updates</span>}
        </div>
        <div className={styles.feed}>
          {catalog ? catalog.feed.map(post => <LivePost post={post} signedIn={signedIn} key={post.id} />)
            : samplePosts.map(post => <SamplePost post={post} key={post.author + post.time} />)}
        </div>
        {catalog && !catalog.feed.length && <p className={styles.empty}>No updates yet. Founders who list can share milestones here.</p>}
      </section>

      <SiteCta onList={openAdd}
        title={<>Someone is looking for a startup like yours <em>right now.</em></>}
        text="List in minutes. Keep full control of who you talk to and how the deal gets done." />
    </main>

    <SiteFooter />

    {showAddStartup && <AddStartupModal triggerRef={trigger} onClose={() => setShowAddStartup(false)} signedIn={signedIn} next="/?submit=1" />}
  </div>;
}
