import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabase } from "@/lib/supabase/server";
import { dollars, marketplaceCard, type MarketplaceCardData } from "@/lib/catalog";
import { buyerUrl, isUuid } from "@/lib/buyer-dashboard";
import { marketplaceStartups } from "@/data/acquire";
import { ListingContact, SaveListingButton } from "@/components/BuyerForms";
import StartupLogo from "@/components/StartupLogo";
import { Icon } from "@/components/icons";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export const metadata: Metadata = { title: "Acquisition opportunity | VerifedDB" };
type Details = {
  website_url: string | null; product_details: Record<string, unknown>;
  revenue_provider: string; verified_at: string | null; measured_on: string; is_owner: boolean;
};
export default async function ListingPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ intent?: string }>;
}) {
  const [{ id }, query, supabase] = await Promise.all([params, searchParams, createSupabase()]);
  let startup: MarketplaceCardData;
  let details: Details | null = null;
  let signedIn = false, saved = false, ready = false, conversation: string | undefined;
  const inquiry = query.intent === "inquiry";
  const destination = `/acquire/${id}${inquiry ? "?intent=inquiry" : ""}`;
  if (supabase) {
    if (!isUuid(id)) notFound();
    const [listing, session] = await Promise.all([
      supabase.from("marketplace_details").select("*").eq("id", id).maybeSingle(),
      supabase.auth.getClaims(),
    ]);
    if (listing.error) throw new Error("Couldn’t load this listing. Please try again.");
    if (!listing.data) {
      // Guest visibility is restricted by the marketplace projection.
      const viewer = Boolean(session.data?.claims.sub);
      return <><SiteHeader signedIn={viewer} current="marketplace" next={destination} /><main className="listing-page"><nav className="listing-nav" aria-label="Listing navigation"><Link className="listing-back" href="/acquire">← Marketplace</Link></nav><div className="seller-card workspace-empty"><Icon name="building" size={28} /><h1>Listing unavailable</h1><p className="muted">It may have sold, been withdrawn, or require a member account.</p><Link className="startup-submit" href={session.data?.claims.sub ? "/acquire" : `/login?next=${encodeURIComponent(destination)}`}>{session.data?.claims.sub ? "Explore other startups" : "Sign in to the marketplace"}</Link></div></main><SiteFooter /></>;
    }
    startup = marketplaceCard(listing.data);
    details = listing.data as Details;
    const owner = session.data?.claims.sub;
    signedIn = Boolean(owner);
    if (owner) {
      const [saveResult, buyerResult, thread] = await Promise.all([
        supabase.from("saved_listings").select("listing_id").eq("listing_id", id).eq("buyer_id", owner).maybeSingle(),
        supabase.from("buyer_profiles").select("id").eq("id", owner).maybeSingle(),
        supabase.from("buyer_conversations").select("id").eq("listing_id", id).maybeSingle(),
      ]);
      if (saveResult.error || buyerResult.error || thread.error) throw new Error("Couldn’t load your activity for this listing. Please refresh.");
      saved = Boolean(saveResult.data); ready = Boolean(buyerResult.data); conversation = thread.data?.id;
    }
  } else {
    const sample = marketplaceStartups.find(item => item.id === id);
    if (!sample) notFound();
    startup = { ...sample, mrr: null, margin: null, foundedOn: null, listedAt: null, country: null, audience: null, mobileApp: null };
  }
  const facts = [
    ["Category", startup.category], ["Audience", startup.audience], ["Product", startup.mobileApp ? "Mobile app" : "Digital business"],
    ["Founded", startup.foundedOn], ["Country", startup.country ? new Intl.DisplayNames("en", { type: "region" }).of(startup.country) : null],
    ["Profit margin · seller reported", startup.margin == null ? null : `${startup.margin}%`],
  ].filter(([, value]) => value);
  const product = Object.entries(details?.product_details ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === "string" && Boolean(entry[1]));
  return <><SiteHeader signedIn={signedIn} current="marketplace" next={destination} /><main className="listing-page"><nav className="listing-nav" aria-label="Listing navigation"><Link className="listing-back" href="/acquire">← Marketplace</Link>{signedIn && <Link href={buyerUrl()} className="seller-button">Buyer workspace <Icon name="chevron" size={14} /></Link>}</nav>
    {!supabase && <p className="listing-sample-note">Sample listing · Sign-in and seller contact require a connected marketplace.</p>}
    <header className="listing-header"><StartupLogo name={startup.name} src={startup.logo || undefined} /><div><span className="workspace-eyebrow">{startup.category}</span><h1>{startup.name}</h1><p className="muted">{startup.private ? "Confidential acquisition opportunity" : "A new chapter starts here"}</p></div>{supabase && !details?.is_owner && <SaveListingButton key={id} id={id} saved={saved} signedIn={signedIn} ready={ready} />}</header>
    <div className="listing-layout"><div><section className="seller-card listing-about"><h2>The opportunity</h2><p>{startup.description || "The seller is keeping this business confidential. Reach out to learn more."}</p>{startup.private && <div className="listing-confidential"><Icon name="shield" size={19} /><p className="muted">Company identity is private. Discuss access to sensitive details directly with the seller.</p></div>}
      {details?.website_url && <a className="seller-button" href={details.website_url} target="_blank" rel="noopener noreferrer">Visit website <Icon name="external" size={15} /></a>}</section>
      <section className="seller-card listing-numbers"><div className="workspace-heading"><h2>Behind the numbers</h2>{details?.verified_at && <span className="status-pill status-positive"><Icon name="shield" size={13} />Provider verified</span>}</div>
        <dl className="listing-financials">{[["Revenue · last 30 days", dollars.format(startup.revenue)], ["Monthly recurring revenue", startup.mrr === null ? "Unavailable" : dollars.format(startup.mrr)], ["Revenue multiple", startup.multiple === null ? "Unavailable" : `${startup.multiple.toFixed(1)}x`], ["Revenue growth · 30d", startup.growth === null ? "Unavailable" : `${startup.growth}%`]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <p className="muted">{details ? `Revenue snapshot from ${details.revenue_provider} · ${details.measured_on}. Only this provider is included. Revenue may include one-time payments.` : "Sample metrics for preview purposes."}</p>
      </section><section className="seller-card"><h2>Business at a glance</h2><dl className="listing-facts">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
      {product.length > 0 && <section className="seller-card"><h2>Product details</h2><dl className="listing-product">{product.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>}
    </div><aside className="listing-contact-column"><section className="seller-card listing-price"><span className="workspace-eyebrow">ASKING PRICE</span><strong>{dollars.format(startup.price)}</strong>{startup.oldPrice && <p className="muted">Previously {startup.oldPrice}</p>}<span className="status-pill">Available for acquisition</span>
      {conversation && <Link className="seller-button" href={buyerUrl("chat", { thread: conversation })}>Your conversation <Icon name="inbox" size={15} /></Link>}</section>
      <section className="seller-card listing-contact" id="contact">{details?.is_owner ? <><h2>This is your listing</h2><Link className="startup-submit" href="/dashboard?mode=seller">Manage your startup</Link></> : !supabase ? <><h2>Explore the buyer experience</h2><p className="muted">Connect Supabase and publish a real listing to start conversations.</p><Link className="seller-button" href="/acquire">Back to marketplace</Link></> : !signedIn ? <><h2>Meet the seller</h2><p className="muted">Sign in to save this startup and discuss an acquisition.</p><Link className="startup-submit" href={`/login?next=${encodeURIComponent(destination)}`}>Sign in to continue</Link></> : !ready ? <><h2>Introduce yourself first</h2><p className="muted">Create your buyer profile so sellers know who they’re talking to.</p><Link className="startup-submit" href={buyerUrl("my-profile", { returnTo: destination })}>Set up buyer profile</Link></> : <><nav className="workspace-tabs" aria-label="Contact type"><Link href={`/acquire/${id}#contact`} aria-current={!inquiry ? "page" : undefined}>Ask a question</Link><Link href={`/acquire/${id}?intent=inquiry#contact`} aria-current={inquiry ? "page" : undefined}>Acquire</Link></nav><ListingContact id={id} inquiry={inquiry} key={`${id}:${inquiry}`} /></>}</section>
    </aside></div></main><SiteFooter /></>;
}
