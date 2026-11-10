/* eslint-disable @next/next/no-img-element */

import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardAddStartup from "@/components/DashboardAddStartup";
import StartupDetailsForm, { type StartupDetails } from "@/components/StartupDetailsForm";
import StartupLogo from "@/components/StartupLogo";
import { createSupabase } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { Icon, type IconName } from "@/components/icons";
import DashboardModeSwitch from "@/components/DashboardModeSwitch";
import { InterestedBuyers, SellerInbox } from "@/components/SellerInbox";
import { SaleRequest, SellerFeedback, SellerProfileForm, SellerSettings, SellerSocials } from "@/components/SellerDashboardForms";
import { sellerTabs, sellerUrl, type DashboardMode, type SellerTab, type SellerLead, type SellerMessage, type SellerProfile } from "@/lib/seller-dashboard";
import { startupDetailsColumns } from "@/lib/startup-details";
import { providerNames, type PaymentSource } from "@/lib/startup-metrics";
import { importedLogoUrl, startupLogoBucket, startupLogoPath } from "@/lib/startup-logo";

export const metadata: Metadata = { title: "Dashboard | VerifedDB" };

type Draft = StartupDetails & { startup_payment_sources: PaymentSource[]; wants_sale: boolean };

type Supabase = NonNullable<Awaited<ReturnType<typeof createSupabase>>>;
const links: { tab: SellerTab; name: string; icon: IconName }[] = [
  { tab: "chat", name: "Inbox", icon: "inbox" },
  { tab: "interested", name: "Interested", icon: "heart" },
  { tab: "my-startups", name: "My startups", icon: "building" },
  { tab: "my-profile", name: "My profile", icon: "profile" },
  { tab: "settings", name: "Settings", icon: "settings" },
  { tab: "feedback", name: "Feedback", icon: "bulb" },
];

type DashboardParams = { startup?: string; mode?: string; tab?: string; thread?: string; folder?: string; filter?: string };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<DashboardParams> }) {
  const [supabase, params] = await Promise.all([createSupabase(), searchParams]);
  const session = await supabase?.auth.getClaims();
  const claims = session?.data?.claims;
  if (!supabase || !claims?.sub) redirect("/login?next=%2Fdashboard");

  const mode: DashboardMode = params.mode === "buyer" && !params.startup ? "buyer" : "seller";
  const tab = sellerTabs.find(item => item === params.tab) ?? "my-startups";
  const email = typeof claims.email === "string" ? claims.email : "";
  return <div className="seller-dashboard">
    <aside className="dashboard-sidebar">
      <div className="dashboard-sidebar-top">
        <Link href="/" className="dashboard-brand"><img src="/assets/reference-0.webp" width="22" height="22" alt="" />VerifedDB</Link>
        <DashboardModeSwitch mode={mode} />
      </div>
      <nav aria-label="Dashboard">
        {mode === "seller" ? links.map(link => <Link key={link.tab} href={sellerUrl(link.tab)} aria-current={tab === link.tab ? "page" : undefined}>
          <Icon name={link.icon} size={17} />{link.name}
        </Link>) : <Link href="/acquire"><Icon name="search" size={17} />Marketplace</Link>}
      </nav>
      <div className="dashboard-sidebar-account"><div>
        <small>Signed in as</small>
        <p title={email}>{email || "VerifedDB member"}</p>
        <form action={signOut}><button className="seller-button" type="submit"><Icon name="logout" size={16} />Log out</button></form>
      </div></div>
    </aside>
    <main className="dashboard-main">
      {mode === "buyer" ? <section className="seller-section seller-narrow">
        <h1>Buyer dashboard</h1><div className="seller-card"><h2>Browse startups</h2><p className="muted">Explore available listings in the marketplace.</p>
          <Link className="startup-submit" href="/acquire">Browse marketplace</Link></div>
      </section> : <SellerContent supabase={supabase} owner={claims.sub} tab={tab} params={params} email={email} />}
    </main>
  </div>;
}

async function SellerContent({ supabase, owner, tab, params, email }: {
  supabase: Supabase; owner: string; tab: SellerTab; params: DashboardParams; email: string;
}) {
  switch (tab) {
    case "chat":
    case "interested": {
      const archived = params.folder === "archive";
      const needsReply = params.filter === "reply";
      const base = supabase.from("seller_leads").select("id,buyer_name,startup_name,created_at,last_message_at,last_sender,archived");
      const list = tab === "interested" ? base.is("last_message_at", null).eq("archived", false).order("created_at", { ascending: false })
        : base.not("last_message_at", "is", null).eq("archived", archived).order("last_message_at", { ascending: false });
      if (tab === "chat" && needsReply) list.eq("last_sender", "buyer");
      const { data, error } = await list.limit(100).returns<SellerLead[]>();
      const leads = data ?? [];
      if (tab === "interested") return <InterestedBuyers leads={leads} failed={Boolean(error)} />;
      const threadId = params.thread;
      let thread = leads.find(lead => lead.id === threadId);
      if (!thread && threadId && /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(threadId)) {
        const selected = await supabase.from("seller_leads").select("id,buyer_name,startup_name,created_at,last_message_at,last_sender,archived").eq("id", threadId).maybeSingle<SellerLead>();
        thread = selected.data ?? undefined;
      }
      const [conversation, settings] = await Promise.all([
        thread ? supabase.from("seller_lead_messages").select("id,sender,body,created_at").eq("lead_id", thread.id)
          .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(100).returns<SellerMessage[]>() : null,
        thread ? supabase.from("profiles").select("timezone").eq("id", owner).maybeSingle<{ timezone: string }>() : null,
      ]);
      return <SellerInbox leads={leads} thread={thread} messages={conversation?.data?.reverse() ?? []}
        timezone={settings?.data?.timezone ?? "UTC"} archived={archived} needsReply={needsReply} failed={Boolean(error || conversation?.error)} />;
    }
    case "my-profile":
    case "settings": {
      const [{ data: profile, error }, auth] = await Promise.all([
        supabase.from("profiles").select("display_name,avatar_url,x_handle,bio,linkedin_url,notify_messages,notify_saved,timezone,deletion_requested_at").eq("id", owner).maybeSingle<SellerProfile>(),
        tab === "my-profile" ? supabase.auth.getUser() : null,
      ]);
      if (error) return <p className="seller-section" role="alert">Couldn’t load your account settings. Refresh to try again.</p>;
      if (tab === "settings") return <section className="seller-section seller-narrow">
        <h1>Settings</h1><p className="seller-description">Manage your account preferences and notifications.</p>
        <div className="seller-stack"><SellerSettings email={email} profile={profile} /></div>
      </section>;
      const emailVerified = Boolean(auth?.data.user?.email_confirmed_at);
      return <section className="seller-section seller-profile-page seller-stack" aria-label="My profile">
        <div className="seller-notice"><Icon name="shield" size={22} /><div><h2>Account verification</h2>
          <p>{emailVerified ? "Your email address is verified." : "Confirm your email address to verify account access."}</p></div>
          {emailVerified && <span className="seller-verification-badge"><Icon name="check" size={15} />Email verified</span>}
        </div>
        <SellerProfileForm profile={profile} /><SellerSocials profile={profile} />
      </section>;
    }
    case "feedback": {
      const { count, error } = await supabase.from("seller_feedback").select("slot", { count: "exact", head: true });
      return <section className="seller-section seller-narrow"><h1>Feedback</h1>
        {error ? <p className="seller-card" role="alert">Couldn’t load the feedback form. Refresh to try again.</p> : <SellerFeedback sent={count ?? 0} />}
      </section>;
    }
    case "my-startups": return <SellerStartups supabase={supabase} owner={owner} selected={params.startup} />;
  }
}

async function SellerStartups({ supabase, owner, selected }: { supabase: Supabase; owner: string; selected?: string }) {
  const { data, error } = await supabase.from("startup_submissions")
    .select(`${startupDetailsColumns},wants_sale,startup_payment_sources(id,provider,name,synced_at)`)
    .eq("owner_id", owner).order("created_at", { ascending: false }).returns<Draft[]>();
  const drafts = data ?? [];
  const { data: signedLogos } = drafts.length
    ? await supabase.storage.from(startupLogoBucket).createSignedUrls(
      drafts.map(draft => startupLogoPath(owner, draft.id)), 3600, { cacheNonce: randomUUID() },
    )
    : { data: null };
  const logoUrls = new Map(signedLogos?.map(logo => [logo.path, logo.signedUrl]));
  const logoFor = (draft: Draft) => logoUrls.get(startupLogoPath(owner, draft.id)) ?? importedLogoUrl(draft.imported_logo_url) ?? undefined;
  const startup = drafts.find(draft => draft.id === selected) ?? drafts[0];


  return (
      <div className="dashboard-workspace">
        <section className="dashboard-startups" aria-labelledby="dashboard-startups-title">
          <div className="dashboard-panel-header">
            <h1 id="dashboard-startups-title">My startups</h1>
            <DashboardAddStartup />
          </div>
          {!drafts.length && !error && <p className="dashboard-empty">No startups yet.</p>}
          {drafts.map(draft => (
            <Link key={draft.id} className="dashboard-startup-row" href={sellerUrl("my-startups", { startup: draft.id })}
              aria-current={draft.id === startup?.id ? "true" : undefined}>
              <StartupLogo name={draft.name} src={logoFor(draft)} />
              <span><strong>{draft.name}</strong><small>{draft.description || [...new Set(draft.startup_payment_sources.map(source => providerNames[source.provider]))].join(" · ") || "Draft"}</small></span>
            </Link>
          ))}
        </section>

        <section className="dashboard-profile" aria-labelledby="dashboard-profile-title">
          <div className="dashboard-panel-header">
            <h2 id="dashboard-profile-title">{startup?.name ?? "Startup details"}</h2>
            {startup && <Link className="dashboard-website" href={`/startup/${startup.id}`}>View <Icon name="external" size={16} /></Link>}
          </div>
          {error ? <p className="dashboard-empty" role="alert">Couldn’t load your startups. Try refreshing this page.</p>
            : startup ? (
              <>
                <div className="seller-startup-banner seller-startup-blue"><span><Icon name="megaphone" size={22} /></span>
                  <div><strong>Showcase your startup</strong><p>Preview your startup page and its revenue metrics.</p></div>
                  <Link href={`/startup/${startup.id}`}>View page →</Link>
                </div>
                <div className="seller-startup-banner seller-startup-green"><span aria-hidden="true">$</span>
                  <div><strong>Sell your startup?</strong><p>Save a request to list your startup on the marketplace.</p></div>
                  <SaleRequest id={startup.id} requested={startup.wants_sale} key={startup.id} />
                </div>
                <div className="dashboard-status dashboard-sources">
                  <div>
                    <strong>Payment providers</strong>
                    <ul>{startup.startup_payment_sources.map(source => (
                      <li key={source.id}>{providerNames[source.provider]} · {source.name}{source.synced_at ? "" : " · Metrics pending"}</li>
                    ))}</ul>
                    {!startup.startup_payment_sources.length && <p>No providers connected.</p>}
                  </div>
                  <DashboardAddStartup startupId={startup.id} key={startup.id} />
                </div>
                <StartupDetailsForm key={startup.id} startup={startup} logoUrl={logoFor(startup)} />
              </>
            ) : <p className="dashboard-empty">Connect Stripe or RevenueCat to add your first startup.</p>}
        </section>
      </div>
  );
}
