import { readSponsorCatalog, readSponsorPrice, sponsorCheckoutEnabled } from "@/lib/sponsor-billing";
import Home from "@/components/Home";
import { readHome } from "@/lib/catalog";
import { createSupabase } from "@/lib/supabase/server";
import { sampleHome } from "@/data/sample";
import type { Metadata } from "next";

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
  return <Home catalog={catalog ?? sampleHome()} sample={!supabase} signedIn={Boolean(session?.data?.claims.sub)}
    sponsors={sponsors} sponsorPrice={sponsorPrice} sponsorCheckout={sponsorCheckoutEnabled()}
    publishedSponsor={publishedSponsor}
    openSubmission={params.submit === "1"} />;
}
