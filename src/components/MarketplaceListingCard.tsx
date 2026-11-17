/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { MarketplaceCardData } from "@/lib/catalog";
import { SaveListingButton } from "./BuyerForms";
import { Icon } from "./icons";

export default function MarketplaceListingCard({ startup, saved = false, signedIn = false, ready = false, sample = false, owned = false }: {
  startup: MarketplaceCardData; saved?: boolean; signedIn?: boolean; ready?: boolean; sample?: boolean; owned?: boolean;
}) {
  return <article className={`marketplace-card opportunity-card${startup.featured ? " promoted" : ""}`}>
    <div className="opportunity-card-top"><span className="marketplace-category">{sample ? "Sample listing" : startup.category}</span>{!sample && (owned ? <Link href="/dashboard?mode=seller" className="save-listing" aria-label="Manage your listing"><Icon name="building" size={16} /></Link> : <SaveListingButton id={startup.id} saved={saved} signedIn={signedIn} ready={ready} />)}</div>
    <Link href={`/acquire/${startup.id}`} className="opportunity-card-link">
      <div className="marketplace-card-body"><div className="marketplace-card-identity">
        {startup.logo ? <img className="marketplace-logo" src={startup.logo} alt="" width="48" height="48" loading="lazy" /> : <span className="marketplace-logo fallback-logo">{startup.name[0]}</span>}
        <div><h2 className={startup.private ? "private" : ""}>{startup.name}</h2><small className="muted">{startup.private ? "Confidential startup" : startup.mobileApp ? "Mobile app" : "Digital business"}</small></div>
      </div><p className="marketplace-description">{startup.description || "Contact the seller to learn about this opportunity."}</p></div>
      <dl className="marketplace-metrics"><div><dt>Revenue · 30d</dt><dd>{startup.revenueLabel}{startup.growth !== null && <span className={startup.growth < 0 ? "negative" : "positive"}>{startup.growth < 0 ? "↓" : "↑"}{Math.abs(startup.growth)}%</span>}</dd></div>
        <div><dt>Asking price</dt><dd>{startup.oldPrice && <del>{startup.oldPrice}</del>}{startup.priceLabel}</dd></div><div><dt>Multiple</dt><dd>{startup.multiple === null ? "—" : `${startup.multiple.toFixed(1)}x`}</dd></div></dl>
      <div className="opportunity-card-footer"><span>{startup.featured ? "Featured opportunity" : "Explore opportunity"}</span><Icon name="chevron" size={15} /></div>
    </Link>
  </article>;
}
