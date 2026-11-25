import type { Metadata } from "next";
import Link from "next/link";
import { createSupabase } from "@/lib/supabase/server";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export const metadata: Metadata = { title: "Not found | VerifedDB", robots: { index: false } };

export default async function NotFound() {
  const supabase = await createSupabase();
  const signedIn = Boolean((await supabase?.auth.getClaims())?.data?.claims.sub);
  return <>
    <SiteHeader signedIn={signedIn} />
    <main className="status-page">
      <span className="eyebrow-pill"><span className="live-dot" />404</span>
      <h1>This page isn’t <em>on the market.</em></h1>
      <p>The link may be wrong, or the startup may have sold or been withdrawn by its founder.</p>
      <div className="status-actions">
        <Link className="startup-submit" href="/acquire">Browse the marketplace</Link>
        {!signedIn && <Link className="seller-button" href="/login?next=%2Facquire">Sign in</Link>}
        <Link className="seller-button" href="/">Home</Link>
      </div>
    </main>
    <SiteFooter />
  </>;
}
