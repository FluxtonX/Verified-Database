import { ImageResponse } from "next/og";
import { OgCard, OgStat } from "@/app/og-card";
import { marketplaceCard, type MarketplaceRow } from "@/lib/catalog";
import { publicSupabase } from "@/lib/supabase/public";
import { isUuid } from "@/lib/buyer-dashboard";
import { sampleListings } from "@/data/sample";

export const alt = "Startup for sale on VerifedDB";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Crawlers aren't signed in, so read the listing exactly as an anonymous visitor would see it.
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = publicSupabase();
  const row = supabase && isUuid(id)
    ? (await supabase.from("marketplace").select("*").eq("id", id).maybeSingle<MarketplaceRow>()).data
    : null;
  const listing = row ? marketplaceCard(row) : sampleListings.find(item => item.id === id);
  if (!listing) return new ImageResponse(<OgCard eyebrow="Marketplace" title="Startups for sale with real revenue" />, size);
  const title = listing.private ? `Confidential ${listing.category} business` : listing.name;
  return new ImageResponse(<OgCard eyebrow="For sale" title={title}>
    <OgStat label="Asking price" value={listing.priceLabel} />
    <OgStat label="Revenue · 30 days" value={listing.revenueLabel} />
    {listing.multiple !== null && <OgStat label="Multiple" value={`${listing.multiple.toFixed(1)}x`} />}
  </OgCard>, size);
}
