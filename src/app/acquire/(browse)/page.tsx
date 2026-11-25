import { readSponsorCatalog, readSponsorPrice, sponsorCheckoutEnabled } from "@/lib/sponsor-billing";
import type { Metadata } from "next";
import { catalogContext, marketplaceStats, queryMarketplace } from "@/lib/catalog";
import { filterListings, parseFilters } from "@/lib/marketplace-filters";
import AcquireMarketplace from "@/components/AcquireMarketplace";
import { sampleListings } from "@/data/sample";

export const metadata: Metadata = {
  title: "Buy and Sell SaaS and Mobile Apps - VerifedDB",
  description: "Browse SaaS, apps and digital businesses for sale, with revenue pulled from Stripe or RevenueCat. Message founders directly.",
  alternates: { canonical: "/acquire" },
  openGraph: { title: "Startups for sale - VerifedDB", description: "Browse SaaS, apps and digital businesses for sale, with revenue pulled from Stripe or RevenueCat." },
};

export default async function AcquirePage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [context, params] = await Promise.all([catalogContext(), searchParams]);
  const filters = parseFilters(params);
  const supabase = context?.supabase;
  const [page, stats, sponsors, sponsorPrice, saves, buyer, owned] = await Promise.all([
    supabase ? queryMarketplace(supabase, filters) : filterListings([...sampleListings], filters),
    supabase ? marketplaceStats(supabase) : {
      listings: sampleListings.length, revenue: sampleListings.reduce((sum, row) => sum + row.revenue, 0),
      multiples: sampleListings.flatMap(row => row.multiple ?? []),
    },
    readSponsorCatalog(),
    readSponsorPrice(),
    context?.signedIn ? context.supabase.from("saved_listings").select("listing_id") : null,
    context?.signedIn ? context.supabase.from("buyer_profiles").select("id").maybeSingle() : null,
    context?.signedIn ? context.supabase.from("seller_publications").select("listing_id") : null,
  ]);
  return <AcquireMarketplace
    filters={filters} listings={page?.rows ?? []} total={page?.total ?? 0} stats={stats}
    ownedIds={owned?.data?.flatMap(item => item.listing_id ?? []) ?? []}
    savedIds={saves?.data?.map(save => save.listing_id) ?? []}
    buyerReady={Boolean(buyer?.data)} buyerActivityFailed={Boolean(saves?.error || buyer?.error || owned?.error)}
    configured={Boolean(context)} failed={Boolean(context && (context.failed || !page || !stats))}
    categories={context?.categories ?? [...new Set(sampleListings.map(row => row.category))].sort()}
    signedIn={context?.signedIn ?? false}
    sponsors={sponsors} sponsorPrice={sponsorPrice} sponsorCheckout={sponsorCheckoutEnabled()}
    openSubmission={params.submit === "1"} />;
}
