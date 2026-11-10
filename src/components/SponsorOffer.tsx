import { startSponsorCheckout } from "@/app/advertise/actions";
import { Icon } from "@/components/icons";
import type { SponsorCatalog, SponsorPrice } from "@/lib/sponsorship";

export function SponsorOffer({ catalog, price, enabled }: { catalog: SponsorCatalog | null; price: SponsorPrice | null; enabled: boolean }) {
  const available = catalog?.available ?? 0;
  const canCheckout = enabled && Boolean(price) && available > 0;
  return <>
    <p className="sponsor-description">Put your startup in front of people discovering and buying businesses on VerifedDB.</p>
    <div className="sponsor-offer-stats">
      <div><Icon name="building" size={22} /><strong>Home</strong><span>Startup discovery</span></div>
      <div><Icon name="search" size={22} /><strong>Marketplace</strong><span>Acquisition buyers</span></div>
      <div className="sponsor-capacity"><Icon name="megaphone" size={22} />
        <strong>{catalog ? `${available}/${catalog.capacity}` : "—"}</strong><span>Spots left</span>
      </div>
    </div>
    <section>
      <h3>How it works</h3>
      <p>Reserve a monthly sponsorship with Stripe, then add your startup name, description, website, and logo. Your card rotates on the homepage and marketplace.</p>
    </section>
    <section className="sponsor-pricing">
      <h3>Pricing</h3>
      <p>{price ? <><strong>{price.label}/month</strong> · Cancel anytime.</> : "Monthly pricing is currently unavailable."}</p>
      {catalog && <p>{available} {available === 1 ? "spot" : "spots"} available now.</p>}
    </section>
    <form action={startSponsorCheckout}>
      {price && <input type="hidden" name="priceId" value={price.id} />}
      <button className="add-startup sponsor-primary" disabled={!canCheckout}>
        Get started{price && ` (${price.label}/mo)`} →
      </button>
    </form>
    {!canCheckout && <p className="sponsor-checkout-note" role="status">
      {catalog && available === 0 ? "All sponsorship spots are currently reserved." : "Checkout is currently unavailable."}
    </p>}
  </>;
}
