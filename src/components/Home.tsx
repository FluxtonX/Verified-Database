"use client";

/* Reference assets are intentionally rendered as local, small images at their native sizes. */
/* eslint-disable @next/next/no-img-element */
import type { SponsorCard, SponsorCatalog, SponsorPrice } from "@/lib/sponsorship";
import { useRef, useState } from "react";
import Link from "next/link";
import { setActivityLike } from "@/app/catalog-actions";
import type { FeedRow, readHome } from "@/lib/catalog";
import data from "@/data/homepage.json";
import SponsorRail from "@/components/SponsorRail";
import { Icon } from "@/components/icons";
import AddStartupModal from "@/components/AddStartupModal";
import { sellerUrl } from "@/lib/seller-dashboard";

type Catalog = Awaited<ReturnType<typeof readHome>>;
type Listing = Catalog["recent"][number];
type Startup = Catalog["startups"][number];

function Brand() {
  return <a className="brand" href="#top" aria-label="VerifedDB home"><img className="brand-star" src={data.images.TrustMRR} width="24" height="24" alt=""/><span>VerifedDB</span></a>;
}


function ListingRow({ title, listings }: { title: string; listings: Listing[] }) {
  return <section className="listing-section" aria-label={title}>
    <div className="section-heading"><h2>{title}</h2><Link href="/acquire">View all <Icon name="chevron" size={12}/></Link></div>
    <div className="listing-track" tabIndex={0} aria-label={`${title}, scroll horizontally for more startups`}>
      {listings.map((listing, i) => <article className={`listing-card ${listing.featured ? "featured" : ""}`} key={`${listing.name}-${i}`}>
        <span className="sale-ribbon">FOR SALE</span>
        <div className="listing-identity">{listing.logo ? <img src={listing.logo} width="32" height="32" alt=""/> : <span className="startup-logo fallback-logo">{listing.name[0]}</span>}<div><h3 className={listing.private ? "private" : ""}>{listing.name}</h3><p>{listing.category}</p></div></div>
        <dl>{[["Revenue", listing.revenue], ["Price", listing.price], ["Multiple", listing.multiple]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      </article>)}
      <Link className="browse-card" href="/acquire">Browse all startups<br/>on the marketplace <Icon name="chevron"/></Link>
    </div>
  </section>;
}

function StartupRow({ startup }: { startup: Startup }) {
  const negative = startup.negative;
  return <tr>
    <td className="rank">{startup.rank <= 3 ? ["🥇", "🥈", "🥉"][startup.rank - 1] : startup.rank}</td>
    <td><div className="startup-identity">{startup.logo ? <img className="startup-logo" src={startup.logo} width="32" height="32" alt="" loading="lazy"/> : <span className="startup-logo fallback-logo">{startup.name[0]}</span>}<div className="startup-copy"><div className="startup-name"><span className={startup.private ? "private" : ""}>{startup.name}</span>{startup.sale && <span className="sale-badge">FOR SALE</span>}</div>{startup.description && <p className={startup.private ? "private" : ""}>{startup.description}</p>}</div></div></td>
    <td className="founder-cell"><div className="founder">{startup.avatar ? <img src={startup.avatar} width="24" height="24" alt="" loading="lazy"/> : startup.founder !== "-" ? <span className="avatar-fallback">{startup.founder[0]}</span> : null}<span>{startup.founder}</span></div></td>
    <td className="mrr">{startup.mrr}{startup.includesNonrecurring && <span className="revenue-warning" title="Revenue includes usage-based or non-subscription payments"><Icon name="warning" size={12}/></span>}</td>
    <td className={`growth ${startup.growth === "—" ? "muted" : negative ? "negative" : "positive"}`}>{startup.growth === "—" ? "—" : `${negative ? "↓" : "↑"} ${startup.growth}`}</td>
  </tr>;
}

const posts = [
  { author: "AadarshhX8|", project: "Betterdata", time: "4h", avatar: "AadarshhX8| profile picture", logo: "Betterdata logo", text: "Betterdata.dev click for 🛹", link: "Betterdata.dev" },
  { author: "Alexander Osso", project: "Directory…", time: "6h", avatar: "Alexander Osso profile picture", logo: "Directory Launch logo", text: "Directory Launch lets business owners claim their own listings.\n\nAn owner confirms a work email on the business’s own domain, or sends a request that you check by hand. You decide whether a claim is free or costs a one-time fee.\n\ndirectory-launch.com", link: "directory-launch.com" },
  { author: "Jitesh Ghanchi🔺", project: "Victra…", time: "16h", avatar: "Jitesh Ghanchi🔺 profile picture", logo: "Victrays logo", text: "if you weren't the founder of your own SaaS, would you actually pay full price to use it?\n\ngenuinely curious how many founders can confidently say yes." },
  { author: "Maryna Klokova", project: "Screen R…", time: "18h", avatar: "Maryna Klokova profile picture", logo: "Screen Records logo", text: "Let your AI agent record, edit and export screen recordings for your demos, tutorials, presentations and anything else.\n\nChatGPT and Claude will save…", image: "Screen Records product update image" },
  { author: "Don.", project: "DockMagic", time: "1d", avatar: "Don. profile picture", logo: "DockMagic logo", text: "DockMagic has officially released version 1.2 with many new features, along with a BLACK FRIDAY Big Sale" },
  { author: "Alexander Osso", project: "Directory…", time: "1d", avatar: "Alexander Osso profile picture", logo: "Directory Launch logo", text: "Directory Launch got a $211 sale on November 2, verified through Polar.\n\nThe buyer pays once and can run as many directory sites as they want from the same Next.js code. All-time verified revenue is now $2,028.\n\ndirectory-launch.com", link: "directory-launch.com" },
];
const images: Record<string, string> = data.images;
function FeedPost({ post }: { post: (typeof posts)[number] }) {
  const [liked, setLiked] = useState(false);
  return <article className="feed-card">
    <img className="post-avatar" src={images[post.avatar]} width="32" height="32" alt="" loading="lazy"/>
    <div className="post-main"><div className="post-heading"><strong>{post.author}</strong><span>on</span><img src={images[post.logo]} width="14" height="14" alt=""/><strong className="post-project">{post.project}</strong><span>· {post.time}</span></div>
      <p className="post-text">{post.link ? post.text.split(post.link).map((part, i) => <span key={i}>{i > 0 && <a href={`https://${post.link}`} target="_blank" rel="noopener noreferrer">{post.link}</a>}{part}</span>) : post.text}</p>
      {post.image && <><span className="show-more-text">Show more</span><img className="post-image" src={images[post.image]} alt="Screen Records product update" loading="lazy"/></>}
      <div className="post-actions"><button onClick={() => setLiked(!liked)} aria-label={liked ? "Unlike update" : "Like update"} aria-pressed={liked} className={liked ? "liked" : ""}><Icon name="heart" size={16}/>{liked ? 1 : 0}</button><span><Icon name="comment" size={16}/>0</span><button aria-label="Copy update link" onClick={() => navigator.clipboard?.writeText(window.location.href + "#feed")}><Icon name="share" size={16}/></button></div>
    </div>
  </article>;
}

function LiveFeedPost({ post, signedIn }: { post: FeedRow; signedIn: boolean }) {
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
  return <article className="feed-card" id={`update-${post.id}`}>
    {post.avatar && <img className="post-avatar" src={post.avatar} width="32" height="32" alt="" loading="lazy"/>}
    <div className="post-main">
      <div className="post-heading"><strong>{post.author}</strong><span>on</span>
        {post.logo && <img src={post.logo} width="14" height="14" alt=""/>}
        <strong className="post-project">{post.project}</strong>
        <time dateTime={post.published_at}>{post.published_at.slice(0, 10)}</time>
      </div>
      <p className="post-text">{post.body}</p>
      {post.image_url && <img className="post-image" src={post.image_url} alt="" loading="lazy"/>}
      <div className="post-actions">
        {signedIn ? <button onClick={like} disabled={pending} aria-label={post.liked ? "Unlike update" : "Like update"}
          aria-pressed={post.liked} className={post.liked ? "liked" : ""}><Icon name="heart" size={16}/>{post.likes}</button>
          : <Link href="/login?next=%2F" aria-label="Log in to like this update"><Icon name="heart" size={16}/>{post.likes}</Link>}
        <button aria-label="Copy update link" onClick={() => navigator.clipboard?.writeText(new URL(`/#update-${post.id}`, window.location.origin).href)}><Icon name="share" size={16}/></button>
      </div>
      {error && <p role="alert">Couldn’t update your like. Try again.</p>}
    </div>
  </article>;
}

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
  const [metric, setMetric] = useState("MRR");
  const [limit, setLimit] = useState(50);
  const [showAddStartup, setShowAddStartup] = useState(openSubmission);
  const addStartupButtonRef = useRef<HTMLButtonElement>(null);
  const source = catalog?.startups ?? data.startups.map(startup => ({
    ...startup, includesNonrecurring: [1, 2, 8].includes(startup.rank),
  }));
  const demoListings = (listings: typeof data.recent) => listings.map(listing => ({
    ...listing, featured: listing.name === "Penmo",
  }));
  const startups = source.filter(s => `${s.name} ${s.description} ${s.founder}`.toLowerCase().includes(query.trim().toLowerCase()));
  const growthValue = (startup: Startup) => startup.growth === "—" ? -Infinity : parseFloat(startup.growth) * (startup.negative ? -1 : 1);
  const sorted = metric === "MoM Growth" ? [...startups].sort((a, b) => growthValue(b) - growthValue(a)) : startups;
  return <>
    {signedIn && <nav className="home-shortcuts" aria-label="Account shortcuts">
      <Link className="home-shortcut-primary" href="/dashboard"><Icon name="profile" size={16}/>Dashboard</Link>
      <Link href={sellerUrl("chat")}><Icon name="comment" size={16}/>Chat</Link>
      <a href="#feed"><Icon name="inbox" size={16}/>Feed</a>
      <Link href="/acquire"><Icon name="search" size={16}/>Marketplace</Link>
    </nav>}
    <SponsorRail catalog={sponsors} price={sponsorPrice} enabled={sponsorCheckout}
      hideLeft={signedIn} featured={publishedSponsor} />
    <main id="top" className="page"><div className="container">
      {publishedSponsor && <p className="home-sponsor-confirmation" role="status">
        {publishedSponsor.name} is now live as a sponsor. <Link href="/advertise">Manage sponsorship →</Link>
      </p>}
      <div className="intro-and-listings"><header className="hero">
        <Brand/>
        <h1>The database of verified startup revenues</h1>
        <p className="hero-description">Browse SaaS, mobile apps, and digital businesses for acquisition on VerifedDB. <Link href="/acquire">Explore the marketplace</Link></p>
        <div className="hero-actions"><label className="search-box"><Icon name="search" size={20}/><input aria-label="Search startups" placeholder="Search startups" value={query} onChange={e => setQuery(e.target.value)}/></label><button ref={addStartupButtonRef} className="add-startup" onClick={() => setShowAddStartup(true)}><Icon name="plus" size={20}/>Add startup</button></div>
        <nav className="hero-nav" aria-label="Main navigation"><Link href="/acquire">Buy/sell</Link><span>·</span><a href="#leaderboard">Stats</a><span>·</span><Link href="/dashboard">Dashboard</Link></nav>
      </header>
      {catalog?.failed && <p role="alert">Some startup data is temporarily unavailable.</p>}<div id="recently-listed"><ListingRow title="Recently listed" listings={catalog?.recent ?? demoListings(data.recent)}/><ListingRow title="Best deals this week" listings={catalog?.deals ?? demoListings(data.deals)}/></div></div>
      <section className="leaderboard" id="leaderboard" aria-labelledby="leaderboard-heading">
        <div className="leaderboard-heading"><h2 id="leaderboard-heading">Leaderboard</h2><div className="leaderboard-filters"><label><span className="sr-only">Sort leaderboard</span><select value={metric} onChange={e=>setMetric(e.target.value)}><option>MRR</option><option>MoM Growth</option></select></label><label><span className="sr-only">Time period</span><select disabled defaultValue="All time"><option>All time</option></select></label></div></div>
        <div className="table-scroll"><table><colgroup><col className="rank-col"/><col className="startup-col"/><col className="founder-col"/><col className="mrr-col"/><col className="growth-col"/></colgroup><thead><tr><th>#</th><th>Startup</th><th className="founder-cell">Founder</th><th className="align-right">MRR</th><th className="align-right">MoM Growth</th></tr></thead><tbody>{sorted.slice(0, limit).map(startup=><StartupRow startup={startup} key={startup.rank}/>)}</tbody></table></div>
        {sorted.length === 0 && <p className="empty-state">{query ? `No startups match “${query}”.` : "No verified startups yet."}</p>}
        {sorted.length > limit && <div className="load-more"><button onClick={() => setLimit(limit + 50)}>Show more ({Math.min(50, sorted.length - limit)} more startups)</button></div>}
      </section>
      <p className="verification-note"><Icon name="shield" size={14}/><span>The leaderboard shows revenue reported by connected payment providers.</span></p>
      <section className="feed" id="feed"><div className="section-heading"><h2>What&apos;s happening?</h2><a href="#feed">View feed <Icon name="chevron" size={12}/></a></div><div className="feed-columns">{catalog
        ? [0, 2, 4].map(i => <div className="feed-column" key={i}>{catalog.feed.slice(i, i + 2).map(post => <LiveFeedPost post={post} signedIn={signedIn} key={post.id}/>)}</div>)
        : [0, 2, 4].map(i => <div className="feed-column" key={i}>{posts.slice(i, i + 2).map(post => <FeedPost post={post} key={post.author + post.time}/>)}</div>)}</div>{catalog && !catalog.feed.length && <p className="empty-state">No updates yet.</p>}</section>
      <footer><Brand/><h2>The database of verified startup revenues</h2><p>VerifedDB · Verified startup revenues</p><a href="#top">Back to top ↑</a></footer>
    </div></main>
    {showAddStartup && <AddStartupModal triggerRef={addStartupButtonRef} onClose={() => setShowAddStartup(false)} signedIn={signedIn} next="/?submit=1" />}
  </>;
}
