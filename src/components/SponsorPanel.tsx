"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "./icons";
import { SponsorOffer } from "./SponsorOffer";
import type { SponsorCard, SponsorCatalog, SponsorPrice } from "@/lib/sponsorship";
import { sponsorCardUrl } from "@/lib/sponsor-links";
import styles from "./SponsorPanel.module.css";

const VISIBLE = 6;

function orderCards(cards: SponsorCard[], placement: "home" | "marketplace", featured?: SponsorCard) {
  const slot = (card: SponsorCard) => {
    const positions = placement === "home" ? card.home_positions : card.marketplace_positions;
    return positions.length ? Math.min(...positions) : 99;
  };
  const ordered = [...cards].sort((a, b) => slot(a) - slot(b));
  return featured ? [featured, ...ordered.filter(card => card.id !== featured.id)] : ordered;
}

/** Sponsor slots as a compact panel, used on the home page and the marketplace. */
export default function SponsorPanel({ catalog, price, enabled, featured, placement = "home" }: {
  catalog: SponsorCatalog | null;
  price: SponsorPrice | null;
  enabled: boolean;
  featured?: SponsorCard;
  placement?: "home" | "marketplace";
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const cards = orderCards(catalog?.cards ?? [], placement, featured).filter(card => sponsorCardUrl(card.website_url));
  const rotates = cards.length > VISIBLE;

  useEffect(() => {
    if (!rotates) return;
    const timer = window.setInterval(() => {
      if (!document.hidden && !panel.current?.matches(":hover, :focus-within")) setOffset(value => value + 1);
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [rotates]);

  const visible = rotates
    ? Array.from({ length: VISIBLE }, (_, index) => cards[(offset + index) % cards.length])
    : cards;

  return <div className={styles.sponsors} ref={panel}>
    <div className={styles.sponsorsHead}>
      <span className={styles.eyebrow}>Sponsors</span>
      {catalog && <span className={styles.sponsorsSpots}>{catalog.available}/{catalog.capacity} open</span>}
    </div>
    <div className={styles.sponsorList}>
      {visible.map(sponsor => <a key={sponsor.id} className={styles.sponsor} href={sponsorCardUrl(sponsor.website_url)!}
        target="_blank" rel="noopener sponsored" referrerPolicy="strict-origin-when-cross-origin">
        <span className={styles.sponsorLogo} style={{ backgroundColor: sponsor.background_color }}>
          {sponsor.logo_url ? <img src={sponsor.logo_url} alt="" width="22" height="22" referrerPolicy="no-referrer" /> : sponsor.name[0]}
        </span>
        <span className={styles.sponsorCopy}><strong>{sponsor.name}</strong><span>{sponsor.headline}</span></span>
        <Icon name="external" size={14} />
      </a>)}
      {!visible.length && <p className={styles.sponsorEmpty}>Your startup could be the first card buyers see here.</p>}
    </div>
    <button type="button" className={styles.sponsorCta} onClick={() => dialog.current?.showModal()}>
      <Icon name="megaphone" size={16} />Advertise here
    </button>
    <dialog ref={dialog} className="sponsor-dialog" aria-labelledby={`${placement}-sponsor-dialog-title`}>
      <form method="dialog"><button className="sponsor-close" aria-label="Close advertising details"><Icon name="close" size={20} /></button></form>
      <h2 id={`${placement}-sponsor-dialog-title`}>Advertise on VerifedDB</h2>
      <SponsorOffer catalog={catalog} price={price} enabled={enabled} />
      <Link className="sponsor-manage" href="/advertise">Manage an existing sponsorship →</Link>
    </dialog>
  </div>;
}
