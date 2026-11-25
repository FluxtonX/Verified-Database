"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { contactListing, saveBuyerPreferences, saveBuyerProfile, sendBuyerFeedback, sendBuyerMessage, setSavedListing, updateAcquisition } from "@/app/dashboard/buyer-actions";
import { buyerUrl, type ActionResult, type BuyerProfile, type InquiryStatus } from "@/lib/buyer-dashboard";
import { Icon } from "./icons";

export function ActionNotice({ state }: { state: ActionResult }) {
  return state.error ? <p className="seller-error" role="alert">{state.error}</p> : state.message ? <p className="seller-result" role="status">{state.message}</p> : null;
}
export function SaveListingButton({ id, saved, signedIn = true, ready = true }: { id: string; saved: boolean; signedIn?: boolean; ready?: boolean }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<ActionResult>({});
  if (!signedIn) return <Link className="save-listing" href={`/login?next=${encodeURIComponent(`/acquire/${id}`)}`} aria-label="Sign in to save startup"><Icon name="heart" size={16} /></Link>;
  if (!ready) return <Link className="save-listing" href={buyerUrl("my-profile", { returnTo: `/acquire/${id}` })} aria-label="Set up your buyer profile to save startup"><Icon name="heart" size={16} /></Link>;
  return <div className="save-listing-wrap"><button type="button" className="save-listing" aria-label={saved ? "Remove saved startup" : "Save startup"} aria-pressed={saved} disabled={pending}
    onClick={() => start(async () => { try { setState(await setSavedListing(id, !saved)); } catch { setState({ error: "Couldn’t save this change. Try again." }); } })}>
    <Icon name="heart" size={16} style={saved ? { fill: "currentColor" } : undefined} />
  </button>{state.error && <p className="save-listing-error" role="alert">{state.error}</p>}</div>;
}
export function BuyerProfileForm({ profile, categories, returnTo }: { profile: BuyerProfile | null; categories: string[]; returnTo?: string }) {
  const [state, action, pending] = useActionState(saveBuyerProfile, {});
  return <form action={action} className="seller-card seller-form">
    {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
    <div><h2>Your buyer profile</h2><p className="muted">Introduce yourself to sellers. Your seller profile is separate.</p></div>
    <label>Name<input name="name" defaultValue={profile?.display_name ?? ""} maxLength={100} required autoComplete="name" /></label>
    <label>About you<textarea name="bio" defaultValue={profile?.bio ?? ""} rows={3} maxLength={180} placeholder="What are you looking to acquire?" /></label>
    <fieldset className="dashboard-section"><legend>Acquisition budget · USD</legend><div className="dashboard-field-grid">
      <label>Minimum<input name="budget-min" type="number" min={0} max={100000000000} step={1} defaultValue={profile?.budget_min ?? ""} placeholder="No minimum" /></label>
      <label>Maximum<input name="budget-max" type="number" min={0} max={100000000000} step={1} defaultValue={profile?.budget_max ?? ""} placeholder="No maximum" /></label>
    </div></fieldset>
    <fieldset className="buyer-category-picker"><legend>Categories you’re interested in</legend>{categories.map(category => <label key={category}><input type="checkbox" name="category" value={category} defaultChecked={profile?.categories.includes(category)} />{category}</label>)}</fieldset>
    <div className="seller-form-actions"><ActionNotice state={state} /><button className="startup-submit" disabled={pending}>{pending ? "Saving…" : "Save buyer profile"}</button></div>
  </form>;
}
export function BuyerPreferences({ profile }: { profile: BuyerProfile | null }) {
  const [state, action, pending] = useActionState(saveBuyerPreferences, {});
  return <form action={action} className="seller-card seller-form seller-settings-card"><h2>Buyer notifications</h2>
    <p className="muted">Save your preferences. Email delivery is pending setup.</p>
    <label className="seller-toggle-row"><span><strong>Seller messages</strong><small>Replies to your conversations and inquiries.</small></span><input className="seller-switch" role="switch" type="checkbox" name="messages" defaultChecked={profile?.notify_messages ?? true} /></label>
    <label className="seller-toggle-row"><span><strong>Price drops</strong><small>Updates to your saved startups.</small></span><input className="seller-switch" role="switch" type="checkbox" name="price-drops" defaultChecked={profile?.notify_price_drops ?? true} /></label>
    {!profile && <Link href={buyerUrl("my-profile")} className="text-link">Set up your buyer profile →</Link>}
    <div className="seller-form-actions"><ActionNotice state={state} /><button className="startup-submit" disabled={pending || !profile}>{pending ? "Saving…" : "Save preferences"}</button></div>
  </form>;
}
export function ListingContact({ id, inquiry }: { id: string; inquiry: boolean }) {
  const [state, action, pending] = useActionState(contactListing.bind(null, id, inquiry), {});
  return <form action={action} className="seller-form"><h2>{inquiry ? "Start an acquisition inquiry" : "Contact the seller"}</h2>
    {inquiry && <><p className="muted">Share your interest and discuss terms with the seller.</p><label>Offer · USD (optional)<input name="offer" type="number" min="0.01" max="100000000000" step="0.01" placeholder="Your proposed price" /></label></>}
    <label>Message<textarea name="message" required maxLength={2000} rows={4} placeholder={inquiry ? "Tell the seller about your acquisition plans…" : "What would you like to know about this startup?"} /></label>
    {inquiry && <small>An inquiry starts a discussion. Payment and ownership transfer are arranged with the seller.</small>}
    <ActionNotice state={state} /><button className="startup-submit" disabled={pending}>{pending ? "Sending…" : inquiry ? "Send acquisition inquiry" : "Send message"}</button>
  </form>;
}
export function BuyerReply({ id }: { id: string }) {
  const [body, setBody] = useState("");
  const [state, action, pending] = useActionState(async (previous: ActionResult, form: FormData) => {
    const result = await sendBuyerMessage(id, previous, form);
    if (result.message) setBody("");
    return result;
  }, {});
  return <form action={action} className="seller-form seller-reply"><textarea aria-label="Message" name="message" rows={2} required maxLength={2000} value={body} onChange={e => setBody(e.target.value)} placeholder="Write to the seller…" />
    <div className="seller-form-actions"><ActionNotice state={state} /><button className="startup-submit" disabled={pending || !body.trim()}>{pending ? "Sending…" : "Send message"}</button></div></form>;
}
export function AcquisitionAction({ id, status, label, confirm, confirmLabel = "Confirm" }: { id: string; status: InquiryStatus; label: string; confirm?: string; confirmLabel?: string }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<ActionResult>({});
  const [confirming, setConfirming] = useState(false);
  return <div><button type="button" className="seller-button" disabled={pending} onClick={() => {
    if (confirm && !confirming) { setConfirming(true); return; }
    start(async () => { try { setState(await updateAcquisition(id, status)); } catch { setState({ error: "Couldn’t update this inquiry. Try again." }); } setConfirming(false); });
  }}>{pending ? "Updating…" : confirming ? confirmLabel : label}</button>
    {confirming && <p>{confirm} <button className="text-link" type="button" onClick={() => setConfirming(false)}>Cancel</button></p>}<ActionNotice state={state} /></div>;
}
export function BuyerFeedback({ sent }: { sent: number }) {
  const [body, setBody] = useState("");
  const [state, action, pending] = useActionState(async (previous: ActionResult, form: FormData) => {
    const result = await sendBuyerFeedback(previous, form); if (result.message) setBody(""); return result;
  }, {});
  const left = Math.max(0, 10 - sent);
  return <form action={action} className="seller-card seller-form"><h2>Help shape the marketplace</h2><p className="muted">What would make buying a startup easier?</p>
    <textarea name="feedback" aria-label="Buyer feedback" required maxLength={2000} rows={7} value={body} onChange={e => setBody(e.target.value)} disabled={!left || pending} placeholder="Share an idea or tell us what needs work…" />
    <div className="seller-form-actions"><small>{body.length}/2000 · {left} messages left</small><button className="startup-submit" disabled={pending || !left || !body.trim()}>{pending ? "Sending…" : "Send feedback"}</button></div><ActionNotice state={state} /></form>;
}
