import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { buyerUrl, type BuyerTab } from "@/lib/buyer-dashboard";
import { sellerUrl, type DashboardMode, type SellerTab } from "@/lib/seller-dashboard";
import DashboardModeSwitch from "./DashboardModeSwitch";
import BrandMark from "./BrandMark";
import { Icon, type IconName } from "./icons";

const buyerLinks: { tab: BuyerTab; name: string; icon: IconName }[] = [
  { tab: "overview", name: "Overview", icon: "building" }, { tab: "acquire", name: "Acquisitions", icon: "heart" },
  { tab: "chat", name: "Inbox", icon: "inbox" }, { tab: "my-profile", name: "My profile", icon: "profile" },
  { tab: "settings", name: "Settings", icon: "settings" }, { tab: "feedback", name: "Feedback", icon: "bulb" },
];
const sellerLinks: { tab: SellerTab; name: string; icon: IconName }[] = [
  { tab: "my-startups", name: "My startups", icon: "building" }, { tab: "chat", name: "Inbox", icon: "inbox" },
  { tab: "interested", name: "Interested buyers", icon: "heart" }, { tab: "my-profile", name: "My profile", icon: "profile" },
  { tab: "settings", name: "Settings", icon: "settings" }, { tab: "feedback", name: "Feedback", icon: "bulb" },
];
export default function DashboardShell({ mode, active, email, children }: { mode: DashboardMode; active: BuyerTab | SellerTab; email: string; children: React.ReactNode }) {
  const links = mode === "buyer" ? buyerLinks.map(link => ({ ...link, href: buyerUrl(link.tab) })) : sellerLinks.map(link => ({ ...link, href: sellerUrl(link.tab) }));
  return <div className="seller-dashboard marketplace-workspace"><aside className="dashboard-sidebar">
    <div className="dashboard-sidebar-top"><Link href="/" className="dashboard-brand"><BrandMark size={26} />VerifedDB</Link><DashboardModeSwitch mode={mode} /></div>
    <div className="dashboard-workspace-label">{mode === "buyer" ? "ACQUIRE A BUSINESS" : "BUILD YOUR NEXT CHAPTER"}</div>
    <nav aria-label="Dashboard">{links.map(link => <Link key={link.tab} href={link.href} aria-current={active === link.tab ? "page" : undefined}><Icon name={link.icon} size={17} />{link.name}</Link>)}
      <Link href="/acquire" className="dashboard-explore"><Icon name="search" size={17} />Explore marketplace<Icon name="external" size={13} /></Link></nav>
    <div className="dashboard-sidebar-account"><div><small>Signed in as</small><p title={email}>{email || "VerifedDB member"}</p><form action={signOut}><button className="seller-button" type="submit"><Icon name="logout" size={16} />Log out</button></form></div></div>
  </aside><main className="dashboard-main"><div className="dashboard-topbar"><span>{mode === "buyer" ? "Buyer" : "Seller"} workspace <span className="muted">/ {links.find(link => link.tab === active)?.name}</span></span><Link href="/">VerifedDB home <Icon name="external" size={13} /></Link></div>{children}</main></div>;
}
