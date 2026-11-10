import Link from "next/link";
import { sellerUrl, type SellerLead, type SellerMessage } from "@/lib/seller-dashboard";
import { Icon } from "./icons";
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

  return <div className="seller-inbox">
    <section className="seller-inbox-list" aria-labelledby="seller-inbox-heading">
      <div className="dashboard-panel-header">
        <h1 id="seller-inbox-heading">Inbox</h1>
        <div className="seller-inline">
          <Link className="seller-button seller-icon-button" aria-label={needsReply ? "Show all conversations" : "Show conversations awaiting reply"}
            title={needsReply ? "Show all conversations" : "Awaiting reply"}
            aria-current={needsReply ? "true" : undefined}
            href={sellerUrl("chat", { ...(archived && { folder: "archive" }), ...(!needsReply && { filter: "reply" }) })}>
            <Icon name="filter" size={16} />
          </Link>
          <details className="seller-folder">
            <summary className="seller-button">{archived ? "Archived" : "Main"}<Icon name="chevrons" size={15} /></summary>
            <div><Link href={sellerUrl("chat")}>Main</Link><Link href={sellerUrl("chat", { folder: "archive" })}>Archived</Link></div>
          </details>
        </div>
      </div>
      {failed ? <p className="dashboard-empty" role="alert">Couldn’t load your inbox. Refresh to try again.</p> :
        leads.length ? leads.map(lead => (
          <Link key={lead.id} className="dashboard-startup-row seller-thread-row" aria-current={lead.id === thread?.id ? "true" : undefined}
            href={sellerUrl("chat", { ...view, thread: lead.id })}>
            <span className="dashboard-startup-mark" aria-hidden="true">{lead.buyer_name.slice(0, 2).toUpperCase()}</span>
            <span><strong>{lead.buyer_name}</strong><small>{lead.startup_name}{lead.last_sender === "buyer" ? " · Awaiting reply" : ""}</small></span>
          </Link>
        )) : <p className="dashboard-empty">{needsReply ? "No conversations awaiting reply." : archived ? "No archived conversations." : "No conversations yet."}</p>}
    </section>

    <div className="seller-inbox-content">
      <section className="seller-messages" aria-label="Conversation">
        {thread ? <>
          <div className="dashboard-panel-header"><h2>{thread.buyer_name}</h2>{thread.last_message_at && <SellerArchive id={thread.id} archived={thread.archived} />}</div>
          <div className="seller-message-list">
            {messages.length ? messages.map(message => (
              <article className={message.sender === "seller" ? "seller-message from-seller" : "seller-message"} key={message.id}>
                <strong>{message.sender === "seller" ? "You" : thread.buyer_name}</strong>
                <p>{message.body}</p>
                <time dateTime={message.created_at}>{date.format(new Date(message.created_at))}</time>
              </article>
            )) : <p className="muted">Start the conversation with {thread.buyer_name}.</p>}
          </div>
          {!thread.archived && <SellerReply id={thread.id} key={thread.id} />}
        </> : <p className="seller-select-thread">Select a conversation.</p>}
      </section>
      <section className="seller-acquisition" aria-labelledby="seller-acquisition-heading">
        <div className="dashboard-panel-header"><h2 id="seller-acquisition-heading">Acquisition details</h2></div>
        {thread ? <dl><div><dt>Startup</dt><dd>{thread.startup_name}</dd></div><div><dt>Buyer</dt><dd>{thread.buyer_name}</dd></div>
          <div><dt>Interest recorded</dt><dd>{date.format(new Date(thread.created_at))}</dd></div></dl>
          : <p className="dashboard-empty">Select a conversation.</p>}
      </section>
    </div>
  </div>;
}

export function InterestedBuyers({ leads, failed }: { leads: SellerLead[]; failed: boolean }) {
  return <section className="seller-section seller-interested">
    <h1>Interested buyers</h1>
    <p className="seller-description">Buyers who saved your startups but haven&apos;t reached out yet. Start the conversation.</p>
    {failed ? <p className="seller-card" role="alert">Couldn’t load interested buyers. Refresh to try again.</p> : leads.length ? (
      <div className="seller-card seller-interest-list">
        {leads.map(lead => <article key={lead.id}>
          <span className="dashboard-startup-mark" aria-hidden="true">{lead.buyer_name.slice(0, 2).toUpperCase()}</span>
          <div><h2>{lead.buyer_name}</h2><p className="muted">Saved {lead.startup_name}</p></div>
          <Link className="seller-button" href={sellerUrl("chat", { thread: lead.id })}>Start conversation <Icon name="chevron" size={14} /></Link>
        </article>)}
      </div>
    ) : <div className="seller-card seller-interest-empty">
      <span><Icon name="heart" size={42} /></span>
      <h2>No interested buyers yet</h2>
      <p>When buyers save your startups to their favorites, they&apos;ll show up here. List your startups for sale to attract buyers.</p>
    </div>}
  </section>;
}
