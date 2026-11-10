"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "./icons";
import { SponsorOffer } from "./SponsorOffer";
import type { SponsorCard, SponsorCatalog, SponsorPrice } from "@/lib/sponsorship";

function Card({ sponsor }: { sponsor: SponsorCard }) {
  return <a className="sponsor-card" style={{ backgroundColor: sponsor.background_color }} href={sponsor.website_url}
    target="_blank" rel="noopener noreferrer sponsored">
    {sponsor.logo_url && <img src={sponsor.logo_url} alt="" width="24" height="24" referrerPolicy="no-referrer" />}
    <h3>{sponsor.name}</h3><p>{sponsor.headline}</p>
  </a>;
}

export default function SponsorRail({ catalog, price, enabled, marketplace = false, hideLeft = false, featured }: {
  catalog: SponsorCatalog | null;
  price: SponsorPrice | null;
  enabled: boolean;
  marketplace?: boolean;
  hideLeft?: boolean;
  featured?: SponsorCard;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [rotation, setRotation] = useState(0);
  const count = catalog?.cards.length ?? 0;

  useEffect(() => {
    if (count <= 1) return;
    const timer = window.setInterval(() => {
      if (!document.hidden && !document.querySelector(".sponsor-card:hover, .sponsor-card:focus, .sponsor-mobile:focus-within")) {
        setRotation(index => index % count + 1);
      }
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [count]);

  const positions = marketplace ? "marketplace_positions" : "home_positions";
  const cards = catalog?.cards ?? [];
  const initial = Array.from({ length: 9 }, (_, index) => cards.find(card => card[positions].includes(index + 1)));
  const paid = featured ?? cards.find(card => !card.home_positions.length && !card.marketplace_positions.length);
  if (paid) initial[8] = paid;
  if (featured) [initial[5], initial[8]] = [initial[8], initial[5]];
  const rotationSlots = hideLeft ? 4 : 9;
  const rotated = cards.length
    ? Array.from({ length: Math.min(cards.length, rotationSlots) }, (_, index) => cards[(rotation - 1 + index) % cards.length])
    : [];
  const visible = rotation === 0 ? (hideLeft ? initial.slice(5) : initial) : rotated;
  const first = (rotation === 0 ? featured : undefined) ?? visible.find(card => card);
  const advertise = (mobile = false) => <button type="button" className={mobile ? "sponsor-mobile-button" : "sponsor-card advertise"}
    onClick={() => dialog.current?.showModal()}>
    <Icon name="megaphone" size={18} /><span>Advertise</span>
    {catalog && <span className="spots">{catalog.available}/{catalog.capacity} spots left</span>}
  </button>;

  return <>
    {!hideLeft && <aside className="sponsor-rail left" aria-label="Left sponsors">
      {visible.slice(0, 5).map((card, index) => card ? <Card key={index} sponsor={card} /> : <div key={index} />)}
    </aside>}
    <aside className="sponsor-rail right" aria-label="Right sponsors">
      {Array.from({ length: 4 }, (_, index) => {
        const card = visible[index + (hideLeft ? 0 : 5)];
        return card ? <Card key={index} sponsor={card} /> : <div key={index} />;
      })}
      {advertise()}
    </aside>
    <aside className="sponsor-mobile" aria-label="Sponsors">
      {first && <Card sponsor={first} />}
      {advertise(true)}
    </aside>
    <dialog ref={dialog} className="sponsor-dialog" aria-labelledby="sponsor-dialog-title">
      <form method="dialog"><button className="sponsor-close" aria-label="Close advertising details"><Icon name="close" size={20} /></button></form>
      <h2 id="sponsor-dialog-title">Advertise on VerifedDB</h2>
      <SponsorOffer catalog={catalog} price={price} enabled={enabled} />
      <Link className="sponsor-manage" href="/advertise">Manage an existing sponsorship →</Link>
    </dialog>
  </>;
}
