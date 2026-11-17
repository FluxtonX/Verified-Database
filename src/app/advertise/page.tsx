import Link from "next/link";
import { SponsorOffer } from "@/components/SponsorOffer";
import { SponsorDetailsForm } from "@/components/SponsorDetailsForm";
import { createSupabase } from "@/lib/supabase/server";
import {
  ownedSponsorship, readSponsorCatalog, readSponsorPrice, sponsorAccount, sponsorAdmin, sponsorCheckoutEnabled, stripeRequest,
  syncSponsorCheckout, type Checkout,
} from "@/lib/sponsor-billing";
import { openSponsorBilling, startSponsorCheckout } from "./actions";

export const metadata = { title: "Advertise | VerifedDB" };

const errors: Record<string, string> = {
  unavailable: "Sponsorship checkout is currently unavailable.",
  "sold-out": "All spots are reserved. Check back for availability.",
  "price-changed": "The sponsorship price changed. Review the current price below.",
  checkout: "Couldn’t open Stripe Checkout. Please try again.",
  details: "Enter a valid name, description, website, and logo URL or image file.",
  "logo-file": "Choose a PNG, JPG, or WebP image under 800 KB.",
  "logo-upload": "Couldn’t upload your logo. Please try again.",
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
        <SponsorDetailsForm sponsorship={sponsorship} />
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

