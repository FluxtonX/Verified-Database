import { readSponsorCatalog, readSponsorPrice, sponsorCheckoutEnabled } from "@/lib/sponsor-billing";
import type { Metadata } from "next";
import { catalogContext, readMarketplace } from "@/lib/catalog";
import AcquireMarketplace from "@/components/AcquireMarketplace";
import { sampleListings } from "@/data/sample";

export const metadata: Metadata = {
  title: "Buy and Sell SaaS and Mobile Apps - VerifedDB",
  description: "Browse SaaS, apps and digital businesses for sale, with revenue pulled from Stripe or RevenueCat. Message founders directly.",
  alternates: { canonical: "/acquire" },
  openGraph: { title: "Startups for sale - VerifedDB", description: "Browse SaaS, apps and digital businesses for sale, with revenue pulled from Stripe or RevenueCat." },
};

export default async function AcquirePage({ searchParams }: {
  searchParams: Promise<{ submit?: string }>;
}) {
  const [context, params] = await Promise.all([catalogContext(), searchParams]);
  const [listings, sponsors, sponsorPrice, saves, buyer, owned] = await Promise.all([
    context && readMarketplace(context.supabase),
    readSponsorCatalog(),
    readSponsorPrice(),
    context?.signedIn ? context.supabase.from("saved_listings").select("listing_id") : null,
    context?.signedIn ? context.supabase.from("buyer_profiles").select("id").maybeSingle() : null,
    context?.signedIn ? context.supabase.from("seller_publications").select("listing_id") : null,
  ]);
  return <AcquireMarketplace ownedIds={owned?.data?.map(item => item.listing_id) ?? []} savedIds={saves?.data?.map(save => save.listing_id) ?? []} buyerReady={Boolean(buyer?.data)} buyerActivityFailed={Boolean(saves?.error || buyer?.error || owned?.error)} listings={context ? listings : sampleListings} configured={Boolean(context)}
    failed={Boolean(context && (context.failed || !listings))}
    categories={context?.categories ?? []} signedIn={context?.signedIn ?? false}
    sponsors={sponsors} sponsorPrice={sponsorPrice} sponsorCheckout={sponsorCheckoutEnabled()}
    openSubmission={params.submit === "1"} />;
}
