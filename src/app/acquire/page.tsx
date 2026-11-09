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
  const listings = context && await readMarketplace(context.supabase);
  return <AcquireMarketplace listings={listings} configured={Boolean(context)}
    failed={Boolean(context && (context.failed || !listings))}
    categories={context?.categories ?? []} signedIn={context?.signedIn ?? false}
    openSubmission={params.submit === "1"} />;
}
