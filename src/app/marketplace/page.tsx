import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MarketplaceBrowser from "@/components/MarketplaceBrowser";

export const metadata: Metadata = {
  title: "Startups for sale — TrustLedger",
  description:
    "Browse small startups for sale with their revenue broken down by type, profit, asking price and verification status.",
};

export default function MarketplacePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero hero-sm">
          <div className="wrap hero-in">
            <p className="eyebrow">Buy and sell startups</p>
            <h1>
              Buy a startup <span className="hl">when you can see how it earns.</span>
            </h1>
            <p className="lead">
              Every listing shows revenue split by type, real profit, and whether the numbers are
              verified. No guessing.
            </p>
          </div>
        </section>

        <section className="section how-mini">
          <div className="wrap">
            <ol className="steps">
              <li>
                <span className="step-n">1</span>
                <h3>Browse and filter</h3>
                <p>Filter by price, category, and how the business earns money.</p>
              </li>
              <li>
                <span className="step-n">2</span>
                <h3>Check the numbers</h3>
                <p>Look for the green &ldquo;Verified&rdquo; badge: the data came straight from the seller&apos;s accounts.</p>
              </li>
              <li>
                <span className="step-n">3</span>
                <h3>Make an offer</h3>
                <p>Send an offer to the seller. Payment will be held in escrow until handover.</p>
              </li>
            </ol>
          </div>
        </section>

        <MarketplaceBrowser />

        <section className="section section-alt">
          <div className="wrap cta-band">
            <div>
              <h2>Want to sell your startup?</h2>
              <p className="sub">
                Connect your accounts, show buyers your real revenue, and set your price. The
                listing form arrives in the next step of the build.
              </p>
            </div>
            <button className="btn btn-dark" disabled title="Coming in the next step">
              List your startup (coming next)
            </button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
