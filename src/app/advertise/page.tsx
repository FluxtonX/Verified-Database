import Link from "next/link";
import { SponsorOffer } from "@/components/SponsorOffer";
import { createSupabase } from "@/lib/supabase/server";
import {
  ownedSponsorship, readSponsorCatalog, readSponsorPrice, sponsorAccount, sponsorAdmin, sponsorCheckoutEnabled, stripeRequest,
  syncSponsorCheckout, type Checkout,
} from "@/lib/sponsor-billing";
import { openSponsorBilling, publishSponsor, startSponsorCheckout } from "./actions";

export const metadata = { title: "Advertise | VerifedDB" };

const errors: Record<string, string> = {
  unavailable: "Sponsorship checkout is currently unavailable.",
  "sold-out": "All spots are reserved. Check back for availability.",
  "price-changed": "The sponsorship price changed. Review the current price below.",
  checkout: "Couldn’t open Stripe Checkout. Please try again.",
  details: "Enter a valid name, description, website, and optional HTTPS logo URL.",
  publish: "Couldn’t publish your card. Check that your sponsorship is active and try again.",
  billing: "Couldn’t open Stripe billing. Please try again.",
};

export default async function AdvertisePage({ searchParams }: {
  searchParams: Promise<{ checkout?: string; error?: string }>;
}) {
  const [params, supabase, user] = await Promise.all([searchParams, createSupabase(), sponsorAccount()]);
  const admin = sponsorAdmin();
  let sponsorship = null;
  let failed = false;
  if (admin && user) {
    try {
      sponsorship = await ownedSponsorship(admin, user.id);
      if (sponsorship?.state === "checkout" && sponsorship.checkout_session_id) {
        const session = await stripeRequest<Checkout>(`checkout/sessions/${encodeURIComponent(sponsorship.checkout_session_id)}`);
        await syncSponsorCheckout(admin, session);
        sponsorship = await ownedSponsorship(admin, user.id);
      }
    } catch {
      failed = true;
    }
  }
  const showOffer = !sponsorship && !failed;
  const [catalog, price] = await Promise.all([
    showOffer ? readSponsorCatalog(supabase) : null,
    showOffer ? readSponsorPrice() : null,
  ]);

  return <main className="sponsor-page">
    <nav aria-label="Sponsorship navigation"><Link href="/">← Home</Link><Link href="/acquire">Marketplace</Link></nav>
    <div className="sponsor-sheet">
      <h1>{sponsorship ? "Your sponsorship" : "Advertise on VerifedDB"}</h1>
      {params.error && Object.hasOwn(errors, params.error) && <p role="alert">{errors[params.error]}</p>}
      {failed && <p role="alert">Couldn’t check your sponsorship. Refresh to try again.</p>}
      {sponsorship?.state === "active" && <>
        <p className="sponsor-description">Your spot is reserved. Add or update the details people will see on your sponsor card.</p>
        <form action={publishSponsor} className="sponsor-details">
          <label>Startup name<input name="name" maxLength={60} defaultValue={sponsorship.name ?? ""} required /></label>
          <label>Short description<textarea name="headline" maxLength={150} rows={3} defaultValue={sponsorship.headline ?? ""} required /></label>
          <label>Website URL<input type="url" name="website" maxLength={2048} placeholder="https://example.com" defaultValue={sponsorship.website_url ?? ""} required /></label>
          <label>Logo URL (optional)<input type="url" name="logo" maxLength={2048} placeholder="https://example.com/logo.png" defaultValue={sponsorship.logo_url ?? ""} /></label>
          <button className="add-startup sponsor-primary">{sponsorship.name ? "Save sponsor card" : "Publish sponsor card"}</button>
        </form>
      </>}
      {sponsorship?.state === "paused" && <p>Your card is paused. Open Stripe billing to check your subscription.</p>}
      {sponsorship?.stripe_customer_id && <form action={openSponsorBilling}><button className="seller-button">Manage Stripe billing <span aria-hidden="true">↗</span></button></form>}
      {sponsorship?.state === "checkout" && <>
        {params.checkout === "success"
          ? <p role="status">Waiting for Stripe to confirm your payment. <Link href="/advertise?checkout=success">Check status</Link>.</p>
          : <p>Complete Stripe Checkout to reserve your sponsorship.</p>}
        <form action={startSponsorCheckout}><button className="add-startup sponsor-primary">Continue to Stripe Checkout →</button></form>
      </>}
      {showOffer && <SponsorOffer catalog={catalog} price={price} enabled={sponsorCheckoutEnabled()} />}
    </div>
  </main>;
}

