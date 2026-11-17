import { readSponsorCatalog, readSponsorPrice, sponsorCheckoutEnabled } from "@/lib/sponsor-billing";
import type { Metadata } from "next";
import { catalogContext, readMarketplace } from "@/lib/catalog";
import AcquireMarketplace from "@/components/AcquireMarketplace";

export const metadata: Metadata = {
  title: "Buy and Sell SaaS and Mobile Apps - VerifedDB",
  description: "Acquire profitable startups. Buy and sell SaaS, mobile apps, and digital businesses on a verified marketplace.",
};

export default async function AcquirePage({ searchParams }: {
  searchParams: Promise<{ submit?: string }>;
}) {
  const [context, params] = await Promise.all([catalogContext(), searchParams]);
  const [listings, sponsors, sponsorPrice, saves, buyer, owned] = await Promise.all([
    context && readMarketplace(context.supabase),
    readSponsorCatalog(context?.supabase ?? null),
    readSponsorPrice(),
    context?.signedIn ? context.supabase.from("saved_listings").select("listing_id") : null,
    context?.signedIn ? context.supabase.from("buyer_profiles").select("id").maybeSingle() : null,
    context?.signedIn ? context.supabase.from("seller_publications").select("listing_id") : null,
  ]);
  return <AcquireMarketplace ownedIds={owned?.data?.map(item => item.listing_id) ?? []} savedIds={saves?.data?.map(save => save.listing_id) ?? []} buyerReady={Boolean(buyer?.data)} buyerActivityFailed={Boolean(saves?.error || buyer?.error || owned?.error)} listings={listings} configured={Boolean(context)}
    failed={Boolean(context && (context.failed || !listings))}
    categories={context?.categories ?? []} signedIn={context?.signedIn ?? false}
    sponsors={sponsors} sponsorPrice={sponsorPrice} sponsorCheckout={sponsorCheckoutEnabled()}
    openSubmission={params.submit === "1"} />;
}
