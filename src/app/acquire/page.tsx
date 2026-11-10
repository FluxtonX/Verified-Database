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
  const [listings, sponsors, sponsorPrice] = await Promise.all([
    context && readMarketplace(context.supabase),
    readSponsorCatalog(context?.supabase ?? null),
    readSponsorPrice(),
  ]);
  return <AcquireMarketplace listings={listings} configured={Boolean(context)}
    failed={Boolean(context && (context.failed || !listings))}
    categories={context?.categories ?? []} signedIn={context?.signedIn ?? false}
    sponsors={sponsors} sponsorPrice={sponsorPrice} sponsorCheckout={sponsorCheckoutEnabled()}
    openSubmission={params.submit === "1"} />;
}
