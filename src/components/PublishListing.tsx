"use client";
import Link from "next/link";
import { useActionState, useRef, useState, useTransition } from "react";
import { publishListing, withdrawListing } from "@/app/dashboard/publish-actions";
import { providerNames, type PaymentSource } from "@/lib/startup-metrics";
import type { ActionResult } from "@/lib/buyer-dashboard";
import { ActionNotice } from "./BuyerForms";
import { SaleRequest } from "./SellerDashboardForms";

export type Publication = { submission_id: string; listing_id: string; asking_price_cents: number; status: string };
export default function PublishListing({ id, sources, publication, requested }: { id: string; sources: PaymentSource[]; publication?: Publication; requested: boolean }) {
  const [state, action, pending] = useActionState(async (previous: ActionResult, form: FormData) => {
    const result = await publishListing(id, previous, form);
    if (key.current) key.current.value = "";
    return result;
  }, {});
  const key = useRef<HTMLInputElement>(null);
  const [withdrawal, setWithdrawal] = useState<ActionResult>({});
  const [withdrawing, start] = useTransition();
  return <section className="publish-listing"><div className="workspace-heading"><div><span className="workspace-eyebrow">MARKETPLACE</span><h2>{publication?.status === "active" ? "Your listing is live" : publication?.status === "sold" ? "Startup acquired" : "Ready for a new owner?"}</h2></div>
    <span className={`status-pill ${publication?.status === "active" ? "status-positive" : ""}`}>{publication?.status ?? "Not listed"}</span></div>
    {publication?.status === "active" && <div className="seller-inline"><Link className="text-link" href={`/acquire/${publication.listing_id}`}>View marketplace listing →</Link><button className="seller-button" disabled={withdrawing} onClick={() => start(async () => { try { setWithdrawal(await withdrawListing(publication.listing_id)); } catch { setWithdrawal({ error: "Couldn’t withdraw this listing. Try again." }); } })}>{withdrawing ? "Withdrawing…" : "Withdraw listing"}</button></div>}
    <ActionNotice state={withdrawal} />
    {publication?.status !== "sold" && <details className="publish-details"><summary>{publication?.status === "active" ? "Update price & verify revenue" : "Publish your startup"}</summary><form action={action} className="seller-form">
      <p className="muted">Verify a connected provider to publish its USD revenue. Your key is used once and never saved.</p>
      <div className="dashboard-field-grid"><label>Asking price · USD<input name="price" type="number" min="0.01" max="100000000000" step="0.01" required defaultValue={publication ? publication.asking_price_cents / 100 : ""} /></label>
        <label>Revenue source<select name="source" required>{sources.map(source => <option key={source.id} value={source.id}>{providerNames[source.provider]} · {source.name}</option>)}</select></label></div>
      <label>Provider secret key<input ref={key} name="api-key" type="password" required autoComplete="off" placeholder="Key for the selected source" maxLength={256} /></label>
      <small>Only the selected source’s revenue is published. Save your startup details before publishing.</small>
      <ActionNotice state={state} /><div className="seller-form-actions"><button className="startup-submit" disabled={pending || !sources.length}>{pending ? "Verifying & publishing…" : "Verify & publish"}</button></div>
    </form>{!publication && <div className="publication-help"><p className="muted">Or save a request for listing review.</p><SaleRequest id={id} requested={requested} /></div>}</details>}
  </section>;
}
