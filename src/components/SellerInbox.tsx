import Link from "next/link";
import { sellerUrl, type SellerLead, type SellerMessage } from "@/lib/seller-dashboard";
import { Icon } from "./icons";
import { AcquisitionAction } from "./BuyerForms";
import { dollars } from "@/lib/catalog";
import { inquiryLabels } from "@/lib/buyer-dashboard";
import InboxRefresh from "./InboxRefresh";
import { WorkspaceHeading } from "./BuyerDashboard";
import { SellerArchive, SellerReply } from "./SellerDashboardForms";

export function SellerInbox({ leads, thread, messages, archived, needsReply, timezone, failed }: {
  leads: SellerLead[];
  thread?: SellerLead;
  messages: SellerMessage[];
  archived: boolean;
  needsReply: boolean;
  timezone: string;
  failed: boolean;
}) {
  const view = { ...(archived && { folder: "archive" }), ...(needsReply && { filter: "reply" }) };
  let date: Intl.DateTimeFormat;
  try {
    date = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: timezone });
  } catch {
    date = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
  }

  const initials = (name: string) => name.split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase();
  const emptyList = needsReply ? "No conversations are waiting on you." : archived ? "No archived conversations." : "No conversations yet.";

  return <section className="workspace-page inbox-page">
    <WorkspaceHeading eyebrow="SELLER INBOX" title="Inbox" description="Talk to buyers about your startups. Deals are agreed directly between you and the buyer.">
      <InboxRefresh />
    </WorkspaceHeading>
    <div className="seller-inbox">
      <section className="seller-inbox-list" aria-labelledby="seller-inbox-heading">
        <div className="inbox-list-header">
          <h2 id="seller-inbox-heading" className="sr-only">Conversations</h2>
          <nav className="inbox-segmented" aria-label="Folder">
            <Link href={sellerUrl("chat", { ...(needsReply && { filter: "reply" }) })} aria-current={!archived ? "page" : undefined}>Main</Link>
            <Link href={sellerUrl("chat", { folder: "archive", ...(needsReply && { filter: "reply" }) })} aria-current={archived ? "page" : undefined}>Archived</Link>
          </nav>
          <Link className={`inbox-filter${needsReply ? " active" : ""}`} aria-pressed={needsReply}
            href={sellerUrl("chat", { ...(archived && { folder: "archive" }), ...(!needsReply && { filter: "reply" }) })}>
            <Icon name="filter" size={14} />Awaiting reply
          </Link>
        </div>
        {failed ? <p className="dashboard-empty" role="alert">Couldn’t load your inbox. Refresh to try again.</p> :
          leads.length ? leads.map(lead => (
            <Link key={lead.id} className="inbox-thread" aria-current={lead.id === thread?.id ? "true" : undefined}
              href={sellerUrl("chat", { ...view, thread: lead.id })}>
              <span className="inbox-avatar" aria-hidden="true">{initials(lead.buyer_name)}</span>
              <span className="inbox-thread-copy"><strong>{lead.buyer_name}</strong><small>{lead.startup_name}</small></span>
              {lead.last_sender === "buyer" && <span className="inbox-badge">Reply</span>}
            </Link>
          )) : <div className="inbox-list-empty"><Icon name="inbox" size={22} /><p>{emptyList}</p>
            {!archived && !needsReply && <Link className="text-link" href={sellerUrl("interested")}>See interested buyers →</Link>}</div>}
      </section>

      <section className="seller-messages" aria-label="Conversation">
        {thread ? <>
          <div className="inbox-thread-header">
            <span className="inbox-avatar" aria-hidden="true">{initials(thread.buyer_name)}</span>
            <div><h2>{thread.buyer_name}</h2><small className="muted">About {thread.startup_name}</small></div>
            {thread.last_message_at && <SellerArchive key={thread.id} id={thread.id} archived={thread.archived} />}
          </div>
          <div className="buyer-inquiry-summary"><span className="status-pill">{inquiryLabels[thread.inquiry_status]}</span>
            {thread.offer_cents && <strong className="inbox-offer">Offer {dollars.format(thread.offer_cents / 100)}</strong>}
            {thread.inquiry_status === "open" && <><AcquisitionAction key={`${thread.id}:accepted`} id={thread.id} status="accepted" label="Discuss acquisition" /><AcquisitionAction key={`${thread.id}:declined`} id={thread.id} status="declined" label="Decline inquiry" /></>}
            {thread.inquiry_status === "accepted" && <><AcquisitionAction key={`${thread.id}:completed`} id={thread.id} status="completed" label="Mark acquired" confirm="Confirm payment and ownership transfer are complete. This removes the listing from the marketplace." /><AcquisitionAction key={`${thread.id}:declined`} id={thread.id} status="declined" label="Close inquiry" /></>}
          </div>
          <div className="seller-message-list">
            {messages.length ? messages.map(message => (
              <article className={message.sender === "seller" ? "seller-message from-seller" : "seller-message"} key={message.id}>
                <strong>{message.sender === "seller" ? "You" : thread.buyer_name}</strong>
                <p>{message.body}</p>
                <time dateTime={message.created_at}>{date.format(new Date(message.created_at))}</time>
              </article>
            )) : <p className="muted inbox-start">Start the conversation with {thread.buyer_name}.</p>}
          </div>
          {!thread.archived && <SellerReply id={thread.id} key={thread.id} />}
        </> : <div className="inbox-placeholder">
          <span><Icon name="comment" size={26} /></span>
          <h2>{leads.length ? "Pick a conversation" : "Your buyer conversations live here"}</h2>
          <p className="muted">{leads.length ? "Choose a buyer on the left to read and reply." : "When a buyer messages you about a listing, the thread opens here. Publish a listing to start getting interest."}</p>
          {!leads.length && <Link className="startup-submit" href={sellerUrl("my-startups")}>Go to my startups</Link>}
        </div>}
      </section>

      <aside className="seller-acquisition" aria-labelledby="seller-acquisition-heading">
        <h2 id="seller-acquisition-heading" className="workspace-eyebrow">Acquisition details</h2>
        {thread ? <dl><div><dt>Startup</dt><dd>{thread.startup_name}</dd></div><div><dt>Buyer</dt><dd>{thread.buyer_name}</dd></div>
          <div><dt>Status</dt><dd>{inquiryLabels[thread.inquiry_status]}</dd></div>
          {thread.offer_cents && <div><dt>Offer</dt><dd className="mono">{dollars.format(thread.offer_cents / 100)}</dd></div>}
          <div><dt>Interest recorded</dt><dd>{date.format(new Date(thread.created_at))}</dd></div></dl>
          : <p className="muted">Details about the buyer’s interest and any offer appear here.</p>}
        <p className="inbox-note"><Icon name="shield" size={14} />Run diligence, contracts and escrow with your own advisors. VerifedDB doesn’t hold funds.</p>
      </aside>
    </div>
  </section>;
}

export function InterestedBuyers({ leads, failed }: { leads: SellerLead[]; failed: boolean }) {
  return <section className="workspace-page workspace-form-page">
    <WorkspaceHeading eyebrow="BUYER INTEREST" title="Interested buyers" description="Buyers who saved one of your startups but haven’t written yet. A short hello often starts the deal." />
    {failed ? <p className="seller-card" role="alert">Couldn’t load interested buyers. Refresh to try again.</p> : leads.length ? (
      <div className="seller-card seller-interest-list">
        {leads.map(lead => <article key={lead.id}>
          <span className="inbox-avatar" aria-hidden="true">{lead.buyer_name.split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase()}</span>
          <div><h2>{lead.buyer_name}</h2><p className="muted">Saved {lead.startup_name}</p></div>
          <Link className="seller-button" href={sellerUrl("chat", { thread: lead.id })}>Start conversation <Icon name="chevron" size={14} /></Link>
        </article>)}
      </div>
    ) : <div className="seller-card workspace-empty">
      <span><Icon name="heart" size={28} /></span>
      <h2>No interested buyers yet</h2>
      <p className="muted">When buyers save your startups, they show up here. Publish a listing to start attracting buyers.</p>
      <Link className="startup-submit" href={sellerUrl("my-startups")}>Go to my startups <Icon name="chevron" size={15} /></Link>
    </div>}
  </section>;
}
