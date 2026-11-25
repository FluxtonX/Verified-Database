import { readSponsorCatalog, readSponsorPrice, sponsorCheckoutEnabled } from "@/lib/sponsor-billing";
import Home from "@/components/Home";
import { readHome } from "@/lib/catalog";
import { createSupabase } from "@/lib/supabase/server";
import { sampleHome } from "@/data/sample";
import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { appOrigin } from "@/lib/supabase/config";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function HomePage({ searchParams }: {
  searchParams: Promise<{ submit?: string; publishedSponsor?: string }>;
}) {
  // One parallel round: the session, the catalog and the (cached) sponsor data don't depend on each other.
  const supabase = await createSupabase();
  const [params, session, catalog, sponsors, sponsorPrice] = await Promise.all([
    searchParams,
    supabase?.auth.getClaims(),
    supabase ? readHome(supabase) : null,
    supabase ? readSponsorCatalog() : null,
    supabase ? readSponsorPrice() : null,
  ]);
  const publishedSponsor = sponsors?.cards.find(card => card.id === params.publishedSponsor);
  const origin = appOrigin();
  return <>
  <JsonLd data={{
    "@context": "https://schema.org", "@type": "WebSite", name: "VerifedDB", url: origin,
    description: "The open market for indie startups with revenue from Stripe or RevenueCat.",
    potentialAction: { "@type": "SearchAction", target: `${origin}/acquire?q={search_term_string}`, "query-input": "required name=search_term_string" },
  }} />
  <Home catalog={catalog ?? sampleHome()} sample={!supabase} signedIn={Boolean(session?.data?.claims.sub)}
    sponsors={sponsors} sponsorPrice={sponsorPrice} sponsorCheckout={sponsorCheckoutEnabled()}
    publishedSponsor={publishedSponsor}
    openSubmission={params.submit === "1"} />
  </>;
}
