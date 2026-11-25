import Link from "next/link";
import { createSupabase } from "@/lib/supabase/server";
import { compactDollars, dollars, readMarketplace } from "@/lib/catalog";
import { buyerUrl, inquiryLabels, isUuid, listingReturn, type BuyerConversation, type BuyerProfile, type BuyerTab } from "@/lib/buyer-dashboard";
import type { SellerMessage } from "@/lib/seller-dashboard";
import { AcquisitionAction, BuyerFeedback, BuyerPreferences, BuyerProfileForm, BuyerReply, SaveListingButton } from "./BuyerForms";
import MarketplaceListingCard from "./MarketplaceListingCard";
import { Icon, type IconName } from "./icons";
import InboxRefresh from "./InboxRefresh";

type Supabase = NonNullable<Awaited<ReturnType<typeof createSupabase>>>;
const date = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

export function WorkspaceHeading({ eyebrow, title, description, children }: { eyebrow: string; title: string; description?: string; children?: React.ReactNode }) {
  return <header className="workspace-heading"><div><span className="workspace-eyebrow">{eyebrow}</span><h1>{title}</h1>{description && <p className="muted">{description}</p>}</div>{children}</header>;
}
export function EmptyWorkspace({ icon, title, description, href, action }: { icon: IconName; title: string; description: string; href?: string; action?: string }) {
  return <div className="workspace-empty"><span><Icon name={icon} size={28} /></span><h2>{title}</h2><p className="muted">{description}</p>{href && <Link className="startup-submit" href={href}>{action} <Icon name="chevron" size={15} /></Link>}</div>;
}

export default async function BuyerDashboard({ supabase, owner, tab, threadId, view, returnTo }: {
  supabase: Supabase; owner: string; tab: BuyerTab; threadId?: string; view?: string; returnTo?: string;
}) {
  const profileResult = await supabase.from("buyer_profiles").select("display_name,bio,budget_min,budget_max,categories,notify_messages,notify_price_drops").eq("id", owner).maybeSingle<BuyerProfile>();
  const profile = profileResult.data;
  if (profileResult.error) return <section className="workspace-page"><WorkspaceHeading eyebrow="BUYER WORKSPACE" title="Your marketplace workspace" /><div className="seller-card" role="alert">Couldn’t load your buyer workspace. Check that the latest database migration has been applied, then refresh.</div></section>;
  if (tab === "my-profile") {
    const categories = await supabase.from("categories").select("name").order("name");
    return <section className="workspace-page workspace-form-page"><WorkspaceHeading eyebrow="BUYER IDENTITY" title="My profile" description="A clear introduction starts a better conversation." />
      {categories.error ? <p role="alert">Couldn’t load categories. Refresh to try again.</p> : <BuyerProfileForm profile={profile} categories={categories.data.map(item => item.name)} returnTo={listingReturn(returnTo)} />}</section>;
  }
  if (tab === "settings") return <section className="workspace-page workspace-form-page"><WorkspaceHeading eyebrow="PREFERENCES" title="Settings" description="Keep your acquisition workspace working for you." /><BuyerPreferences profile={profile} /><div className="seller-card"><h2>Acquisition criteria</h2><p className="muted">Manage your budget and preferred categories in your buyer profile.</p><Link className="text-link" href={buyerUrl("my-profile")}>Edit buyer profile →</Link></div></section>;
  if (tab === "feedback") {
    const result = await supabase.from("buyer_feedback").select("slot", { count: "exact", head: true });
    return <section className="workspace-page workspace-form-page"><WorkspaceHeading eyebrow="YOUR IDEAS" title="Feedback" />{result.error ? <p role="alert">Couldn’t load feedback. Please refresh.</p> : <BuyerFeedback sent={result.count ?? 0} />}</section>;
  }
  if (tab === "chat") return <BuyerInbox supabase={supabase} threadId={threadId} />;

  const [savedResult, conversationsResult, marketplace, owned] = await Promise.all([
    supabase.from("saved_listings").select("listing_id,created_at").eq("buyer_id", owner).order("created_at", { ascending: false }),
    supabase.from("buyer_conversations").select("*").order("created_at", { ascending: false }).returns<BuyerConversation[]>(),
    readMarketplace(supabase),
    supabase.from("seller_publications").select("listing_id"),
  ]);
  if (savedResult.error || conversationsResult.error || owned.error || !marketplace) return <section className="workspace-page"><p className="seller-card" role="alert">Couldn’t load your acquisition activity. Refresh to try again.</p></section>;
  const saves = savedResult.data;
  const savedIds = new Set(saves.map(save => save.listing_id));
  const conversations = conversationsResult.data ?? [];
  const talking = conversations.filter(item => item.last_message_at);
  const inquiries = conversations.filter(item => item.inquiry_status !== "none");
  const awaiting = talking.filter(item => item.last_sender === "seller");
  const ownIds = new Set(owned.data?.map(item => item.listing_id));
  const recommendations = marketplace.filter(item => !ownIds.has(item.id) && !savedIds.has(item.id) &&
    (profile?.budget_min == null || item.price >= profile.budget_min) && (profile?.budget_max == null || item.price <= profile.budget_max) &&
    (!profile?.categories.length || profile.categories.includes(item.category))).slice(0, 3);

  if (tab === "acquire") {
    const current = view === "talking" ? "talking" : view === "deals" ? "deals" : "saved";
    return <section className="workspace-page"><WorkspaceHeading eyebrow="YOUR PIPELINE" title="Acquisitions" description="From a first save to your next startup."><Link className="startup-submit" href="/acquire">Explore marketplace <Icon name="external" size={15} /></Link></WorkspaceHeading>
      <nav className="workspace-tabs" aria-label="Acquisition stage">{[["saved", "Saved", saves.length], ["talking", "Conversations", talking.length], ["deals", "Inquiries", inquiries.length]].map(([key, name, count]) => <Link key={key} href={buyerUrl("acquire", { view: String(key) })} aria-current={current === key ? "page" : undefined}>{name}<span>{count}</span></Link>)}</nav>
      {current === "saved" ? saves.length ? <div className="workspace-listing-grid">{saves.map(save => {
        const listing = marketplace.find(item => item.id === save.listing_id);
        return listing ? <MarketplaceListingCard key={listing.id} startup={listing} signedIn ready={Boolean(profile)} saved /> : <article key={save.listing_id} className="seller-card unavailable-listing"><Icon name="building" size={24} /><h2>Listing no longer available</h2><p className="muted">This startup may have sold or been withdrawn.</p><SaveListingButton id={save.listing_id} saved /></article>;
      })}</div> : <EmptyWorkspace icon="heart" title="Build your shortlist" description="Save the startups that fit your next chapter." href="/acquire" action="Find your first opportunity" />
        : <ConversationTable conversations={current === "talking" ? talking : inquiries} inquiry={current === "deals"} />}
    </section>;
  }

  return <section className="workspace-page"><WorkspaceHeading eyebrow="BUYER WORKSPACE" title={profile ? `Welcome back, ${profile.display_name.split(" ")[0]}` : "Find your next chapter"} description="Good businesses. Clear numbers. Your next move."><Link className="startup-submit" href="/acquire">Explore marketplace <Icon name="chevron" size={15} /></Link></WorkspaceHeading>
    {!profile && <div className="workspace-onboarding"><span className="workspace-onboarding-icon"><Icon name="profile" size={23} /></span><div><h2>Make your first introduction</h2><p className="muted">Set up a buyer profile to save startups and talk to sellers.</p></div><Link className="seller-button" href={buyerUrl("my-profile")}>Set up profile →</Link></div>}
    <div className="workspace-stats">{[
      { label: "Saved startups", value: saves.length, icon: "heart" as const, href: buyerUrl("acquire") },
      { label: "Conversations", value: talking.length, icon: "inbox" as const, href: buyerUrl("chat") },
      { label: "Active inquiries", value: inquiries.filter(item => ["open", "accepted"].includes(item.inquiry_status)).length, icon: "building" as const, href: buyerUrl("acquire", { view: "deals" }) },
    ].map(stat => <Link key={stat.label} href={stat.href} className="workspace-stat"><span><Icon name={stat.icon} size={18} />{stat.label}</span><strong>{stat.value}</strong><Icon name="chevron" size={15} /></Link>)}</div>
    <div className="workspace-overview-grid"><section className="seller-card workspace-activity"><div className="workspace-heading"><h2>{awaiting.length ? "Latest seller replies" : "Your conversations"}</h2><Link className="text-link" href={buyerUrl("chat")}>Inbox →</Link></div>
      {(awaiting.length ? awaiting : talking).slice(0, 4).map(item => <Link key={item.id} className="workspace-activity-row" href={buyerUrl("chat", { thread: item.id })}><span className="dashboard-startup-mark"><Icon name="inbox" size={18} /></span><div><strong>{item.startup_name}</strong><small>{item.last_sender === "seller" ? "Seller replied" : "Waiting for a seller reply"}</small></div><Icon name="chevron" size={15} /></Link>)}
      {!talking.length && <EmptyWorkspace icon="inbox" title="Every deal starts with a conversation" description="Open a listing and ask the seller a question." href="/acquire" action="Explore startups" />}</section>
      <section className="workspace-criteria seller-card"><span className="workspace-eyebrow">YOUR SEARCH</span><h2>A business that fits you</h2><p className="muted">Acquisition budget</p><strong>{profile?.budget_min != null || profile?.budget_max != null ? `${profile.budget_min == null ? "$0" : compactDollars.format(profile.budget_min)} – ${profile.budget_max == null ? "No limit" : compactDollars.format(profile.budget_max)}` : "Open to opportunities"}</strong><div className="workspace-tags">{profile?.categories.length ? profile.categories.map(item => <span key={item}>{item}</span>) : <span>All categories</span>}</div><Link className="text-link" href={buyerUrl("my-profile")}>Refine your criteria →</Link></section></div>
    <section className="workspace-recommendations"><div className="workspace-heading"><div><span className="workspace-eyebrow">DISCOVER</span><h2>Worth a closer look</h2></div><Link className="text-link" href="/acquire">View all startups →</Link></div>
      {recommendations.length ? <div className="workspace-listing-grid">{recommendations.map(startup => <MarketplaceListingCard key={startup.id} startup={startup} signedIn ready={Boolean(profile)} />)}</div> : <div className="seller-card"><p className="muted">No new listings match your criteria yet.</p><Link className="text-link" href="/acquire">Explore all opportunities →</Link></div>}</section>
  </section>;
}

function ConversationTable({ conversations, inquiry }: { conversations: BuyerConversation[]; inquiry: boolean }) {
  if (!conversations.length) return <EmptyWorkspace icon={inquiry ? "building" : "inbox"} title={inquiry ? "Your next acquisition starts here" : "Start a conversation"} description={inquiry ? "Send an acquisition inquiry from a listing to track it here." : "Reach out to a seller to learn more about a startup."} href="/acquire" action="Explore marketplace" />;
  return <div className="seller-card workspace-pipeline">{conversations.map(item => <Link className="workspace-activity-row" key={item.id} href={buyerUrl("chat", { thread: item.id })}><div><strong>{item.startup_name}</strong><small>{item.offer_cents ? dollars.format(item.offer_cents / 100) : "Open conversation"}</small></div><span className="status-pill">{inquiryLabels[item.inquiry_status]}</span><Icon name="chevron" size={15} /></Link>)}</div>;
}

async function BuyerInbox({ supabase, threadId }: { supabase: Supabase; threadId?: string }) {
  const result = await supabase.from("buyer_conversations").select("*").not("last_message_at", "is", null).order("last_message_at", { ascending: false }).limit(100).returns<BuyerConversation[]>();
  let thread = result.data?.find(item => item.id === threadId);
  if (!thread && threadId && isUuid(threadId)) {
    const selected = await supabase.from("buyer_conversations").select("*").eq("id", threadId).maybeSingle<BuyerConversation>();
    thread = selected.data ?? undefined;
  }
  const messages = thread ? await supabase.from("seller_lead_messages").select("id,sender,body,created_at").eq("lead_id", thread.id).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(100).returns<SellerMessage[]>() : null;
  return <section className="workspace-page inbox-page"><WorkspaceHeading eyebrow="BUYER INBOX" title="Inbox" description="Keep the conversation moving."><InboxRefresh /></WorkspaceHeading>
    {result.error || messages?.error ? <p className="seller-card" role="alert">Couldn’t load conversations. Refresh to try again.</p> : <div className="buyer-inbox">
      <nav className="buyer-thread-list" aria-label="Buyer conversations">{result.data?.length ? result.data.map(item => <Link className="inbox-thread" key={item.id} href={buyerUrl("chat", { thread: item.id })} aria-current={thread?.id === item.id ? "page" : undefined}><span className="inbox-avatar">{item.startup_name.slice(0, 2).toUpperCase()}</span><span className="inbox-thread-copy"><strong>{item.startup_name}</strong><small>{inquiryLabels[item.inquiry_status]}</small></span>{item.last_sender === "seller" && <span className="inbox-badge">New</span>}</Link>) : <div className="dashboard-empty">No conversations yet.<br /><Link className="text-link" href="/acquire">Find a startup →</Link></div>}</nav>
      <section className="buyer-conversation" aria-label="Conversation">{thread ? <><div className="inbox-thread-header"><span className="inbox-avatar" aria-hidden="true">{thread.startup_name.slice(0, 2).toUpperCase()}</span><div><h2>{thread.startup_name}</h2><small className="muted">Messages · times in UTC</small></div><Link className="seller-button" href={`/acquire/${thread.listing_id}`}>View listing</Link></div>
        <div className="buyer-inquiry-summary"><span className="status-pill">{inquiryLabels[thread.inquiry_status]}</span>{thread.offer_cents && <strong className="inbox-offer">Offer {dollars.format(thread.offer_cents / 100)}</strong>}
          {["open", "accepted"].includes(thread.inquiry_status) && <AcquisitionAction key={thread.id} id={thread.id} status="withdrawn" label="Withdraw inquiry" confirm="The seller will see that you withdrew. You can send a new inquiry later." confirmLabel="Confirm withdrawal" />}
          {thread.inquiry_status === "none" && <Link className="text-link" href={`/acquire/${thread.listing_id}?intent=inquiry#contact`}>Start acquisition inquiry →</Link>}</div>
        <div className="seller-message-list">{messages?.data?.length === 100 && <p className="muted">Showing the latest 100 messages.</p>}{messages?.data?.slice().reverse().map(message => <article className={`seller-message${message.sender === "buyer" ? " from-seller" : ""}`} key={message.id}><strong>{message.sender === "buyer" ? "You" : "Seller"}</strong><p>{message.body}</p><time dateTime={message.created_at}>{date.format(new Date(message.created_at))}</time></article>)}</div><BuyerReply id={thread.id} key={thread.id} />
      </> : <EmptyWorkspace icon="inbox" title={threadId ? "Conversation unavailable" : "A little due diligence goes a long way"} description={threadId ? "Choose one of your conversations to continue." : "Choose a conversation to ask questions and explore the details."} />}</section>
    </div>}
  </section>;
}
