"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import BrandMark from "./BrandMark";
import { Icon } from "./icons";
import { sellerUrl } from "@/lib/seller-dashboard";
import styles from "./Site.module.css";

type Section = "home" | "marketplace" | "advertise";
type ListAction = (event: MouseEvent<HTMLButtonElement>) => void;

/** Opens the add-startup flow: in place when the page has the modal, otherwise on the home page. */
function ListButton({ onList, className, children }: { onList?: ListAction; className: string; children: ReactNode }) {
  return onList ? <button type="button" className={className} onClick={onList}>{children}</button>
    : <Link href="/?submit=1" className={className}>{children}</Link>;
}

export function Brand({ size = 28 }: { size?: number }) {
  return <Link href="/" className={styles.brand} aria-label="VerifedDB home"><BrandMark size={size} /><span>VerifedDB</span></Link>;
}

export function SiteHeader({ signedIn, current, onList, next = "/" }: {
  signedIn: boolean; current?: Section; onList?: ListAction; next?: string;
}) {
  const here = (section: Section) => current === section ? "page" as const : undefined;
  return <header className={styles.nav}>
    <div className={styles.navInner}>
      <Brand />
      <nav className={styles.navLinks} aria-label="Main navigation">
        <Link href="/acquire" aria-current={here("marketplace")}>Marketplace</Link>
        <Link href="/#leaderboard">Leaderboard</Link>
        <Link href="/#how-it-works">How it works</Link>
        <Link href="/advertise" aria-current={here("advertise")}>Advertise</Link>
      </nav>
      <div className={styles.navActions}>
        {signedIn ? <>
          <Link className={styles.navGhost} href={sellerUrl("chat")}><Icon name="inbox" size={16} /><span>Inbox</span></Link>
          <Link className={styles.navGhost} href="/dashboard"><Icon name="profile" size={16} /><span>Dashboard</span></Link>
        </> : <Link className={styles.navGhost} href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link>}
        <ListButton onList={onList} className={styles.navCta}><Icon name="plus" size={16} /><span>List startup</span></ListButton>
      </div>
    </div>
  </header>;
}

export function SiteCta({ title, text, onList, secondary = { href: "/acquire", label: "Browse startups" } }: {
  title: ReactNode; text: string; onList?: ListAction; secondary?: { href: string; label: string };
}) {
  return <section className={styles.cta}>
    <div><h2>{title}</h2><p>{text}</p></div>
    <div className={styles.ctaActions}>
      <ListButton onList={onList} className={styles.primaryLight}><Icon name="plus" size={18} />List your startup</ListButton>
      <Link href={secondary.href} className={styles.ghostLight}>{secondary.label}</Link>
    </div>
  </section>;
}

export function SiteFooter() {
  return <footer className={styles.footer}>
    <div className={styles.footerInner}>
      <div className={styles.footerBrand}>
        <Brand size={24} />
        <p>Where founders with real revenue meet the people who want to buy.</p>
      </div>
      <nav className={styles.footerLinks} aria-label="Footer">
        <Link href="/acquire">Marketplace</Link>
        <Link href="/#leaderboard">Leaderboard</Link>
        <Link href="/advertise">Advertise</Link>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/llms.txt">llms.txt</Link>
      </nav>
    </div>
    <p className={styles.disclaimer}>
      VerifedDB is a listing and discovery platform. We are not a broker, escrow agent, or verifier of legal, tax or compliance
      matters. Revenue figures are retrieved from the payment provider each founder connects; buyers should complete their own due diligence.
    </p>
  </footer>;
}
