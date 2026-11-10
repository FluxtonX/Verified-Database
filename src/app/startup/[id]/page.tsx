import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabase } from "@/lib/supabase/server";
import { startupDetailsColumns, startupWebsite, storeLink } from "@/lib/startup-details";
import { importedLogoUrl, startupLogoBucket, startupLogoPath } from "@/lib/startup-logo";
import { providerNames, type PaymentSource } from "@/lib/startup-metrics";
import StartupLogo from "@/components/StartupLogo";
import StartupRevenue from "@/components/StartupRevenue";
import type { StartupDetails } from "@/components/StartupDetailsForm";
import { Icon } from "@/components/icons";

export const metadata: Metadata = { title: "Startup metrics | VerifedDB", robots: { index: false, follow: false } };

type Startup = StartupDetails & { startup_payment_sources: PaymentSource[] };

export default async function StartupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id)) notFound();

  const supabase = await createSupabase();
  const session = await supabase?.auth.getClaims();
  const owner = session?.data?.claims.sub;
  if (!supabase || !owner) redirect("/login?next=%2Fdashboard");

  const { data: startup, error } = await supabase.from("startup_submissions")
    .select(`${startupDetailsColumns},startup_payment_sources(id,provider,name,metrics,synced_at)`)
    .eq("id", id).eq("owner_id", owner).maybeSingle<Startup>();
  if (error) throw new Error("Couldn’t load this startup.");
  if (!startup) notFound();

  const { data: logo } = await supabase.storage.from(startupLogoBucket).createSignedUrl(startupLogoPath(owner, id), 3600);
  const edit = `/dashboard?startup=${startup.id}`;
  const appStore = startup.mobile_app && storeLink(startup.app_store_url ?? "", "apps.apple.com");
  const googlePlay = startup.mobile_app && storeLink(startup.google_play_url ?? "", "play.google.com");
  const website = startupWebsite(startup.website_url ?? "") || appStore || googlePlay;
  const founded = startup.founded_on
    ? new Date(`${startup.founded_on}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
    : "—";
  const country = startup.country ? new Intl.DisplayNames(["en"], { type: "region" }).of(startup.country) ?? startup.country : "";
  const sources = startup.startup_payment_sources;
  const insights = [
    ["Team size", startup.team_size ? `${startup.team_size} ${startup.team_size === "1" ? "person" : "people"}` : ""],
    ["Funding", startup.funding === "bootstrapped" ? "Bootstrapped" : startup.funding === "vc-backed" ? "VC-backed" : ""],
    ["Markets", startup.markets.join(" · ")],
    ["Tech stack", [...new Set([...startup.tech_stack, ...sources.map(source => providerNames[source.provider])])].join(" · ")],
    ["Marketing channels", startup.marketing_channels.join(" · ")],
    ["Product type", startup.mobile_app ? "Mobile app" : ""],
    ["Domain rating", "Unavailable"],
  ];
  const product = [
    ["Value proposition", startup.value_proposition], ["Problem solved", startup.problem_solved],
    ["Audience", startup.audience_description], ["Pricing", startup.pricing], ["Additional info", startup.additional_info],
  ].filter(([, value]) => value);

  return (
    <main className="startup-profile-page">
      <nav className="profile-nav" aria-label="Startup page">
        <Link href={edit}>Dashboard</Link>
        <Link href="/#feed">Feed</Link>
        <Link href="/acquire">Marketplace</Link>
      </nav>
      <div className="profile-container">
        <p className="profile-breadcrumb"><Link href="/">✦ VerifedDB</Link> <span>›</span> Startup <span>›</span> <strong>{startup.name}</strong></p>
        <header className="profile-header">
          <StartupLogo name={startup.name} src={logo?.signedUrl ?? importedLogoUrl(startup.imported_logo_url) ?? undefined} />
          <div className="profile-title"><h1>{startup.name}</h1>{startup.description && <p>{startup.description}</p>}</div>
          <div className="profile-actions">
            <Link href={edit}>Edit</Link>
            {website && <a className="profile-visit" href={website} target="_blank" rel="noopener noreferrer">Visit <Icon name="external" size={16} /></a>}
          </div>
        </header>

        <StartupRevenue key={sources.map(source => source.id).join(",")} sources={sources} founder={startup.x_handle} founded={founded} country={country} margin={startup.profit_margin_pct} />

        <section className="profile-insights">
          <h2>Startup insights</h2>
          <dl>{insights.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "—"}</dd></div>)}</dl>
          {(appStore || googlePlay) && <div className="profile-actions">
            {appStore && <a href={appStore} target="_blank" rel="noopener noreferrer">Apple App Store <Icon name="external" size={16} /></a>}
            {googlePlay && <a href={googlePlay} target="_blank" rel="noopener noreferrer">Google Play <Icon name="external" size={16} /></a>}
          </div>}
        </section>

        {product.length > 0 && <section className="profile-insights">
          <h2>Product details</h2>
          <dl>{product.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        </section>}
        <section className="profile-insights">
          <h2>Product updates</h2>
          <p className="muted">No product updates yet.</p>
        </section>
        <section className="profile-discover"><h2>Discover more startups</h2><Link href="/acquire">Explore the marketplace →</Link></section>
      </div>
    </main>
  );
}
