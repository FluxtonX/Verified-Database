import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabase } from "./supabase/server";

export const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const compactDollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
const compactCount = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

type MarketplaceRow = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  logo: string | null;
  founded_on: string | null;
  country: string | null;
  audience: string | null;
  mobile_app: boolean | null;
  anonymous: boolean;
  listed_at: string | null;
  featured: boolean;
  views: number;
  offers: number;
  profit_margin_pct: number | null;
  asking_price_cents: number;
  previous_price_cents: number | null;
  revenue_30d_cents: number;
  mrr_cents: number | null;
  revenue_growth_pct: number | null;
  multiple: number | null;
};

export function marketplaceCard(row: MarketplaceRow) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description ?? "",
    logo: row.logo ?? "",
    private: row.anonymous,
    featured: row.featured,
    views: compactCount.format(row.views),
    offers: row.offers,
    price: row.asking_price_cents / 100,
    priceLabel: compactDollars.format(row.asking_price_cents / 100),
    oldPrice: row.previous_price_cents === null ? "" : compactDollars.format(row.previous_price_cents / 100),
    revenue: row.revenue_30d_cents / 100,
    revenueLabel: compactDollars.format(row.revenue_30d_cents / 100),
    mrr: row.mrr_cents === null ? null : row.mrr_cents / 100,
    growth: row.revenue_growth_pct,
    multiple: row.multiple,
    margin: row.profit_margin_pct,
    listedAt: row.listed_at,
    foundedOn: row.founded_on,
    country: row.country,
    audience: row.audience,
    mobileApp: row.mobile_app,
  };
}

export type MarketplaceCardData = ReturnType<typeof marketplaceCard>;

export async function catalogContext() {
  const supabase = await createSupabase();
  if (!supabase) return null;

  const [session, categories] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.from("categories").select("name").order("name").returns<{ name: string }[]>(),
  ]);
  return {
    supabase,
    signedIn: Boolean(session.data?.claims.sub),
    categories: categories.data?.map(category => category.name) ?? [],
    failed: Boolean(categories.error),
  };
}

export async function readMarketplace(supabase: SupabaseClient) {
  const rows: MarketplaceCardData[] = [];
  const batchSize = 250;
  // PostgREST caps each response. Read each page before applying the existing
  // in-browser filters so the count and sort cover the visible catalog.
  for (let offset = 0; ; offset += batchSize) {
    const result = await supabase.from("marketplace").select("*")
      .order("featured", { ascending: false }).order("multiple", { nullsFirst: false })
      .order("id").range(offset, offset + batchSize - 1).returns<MarketplaceRow[]>();
    if (result.error) return null;
    rows.push(...result.data.map(marketplaceCard));
    if (result.data.length < batchSize) return rows;
  }
}

type LeaderboardRow = {
  id: string;
  name: string;
  description: string | null;
  logo: string | null;
  founder: string | null;
  avatar: string | null;
  anonymous: boolean;
  for_sale: boolean;
  mrr_cents: number;
  mrr_growth_pct: number | null;
  includes_nonrecurring: boolean;
};

export type FeedRow = {
  id: string;
  author: string;
  avatar: string | null;
  project: string;
  logo: string | null;
  body: string;
  image_url: string | null;
  published_at: string;
  likes: number;
  liked: boolean;
};

export async function readHome(supabase: SupabaseClient) {
  const marketplace = supabase.from("marketplace");
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [leaderboard, recent, deals, feed] = await Promise.all([
    supabase.from("leaderboard").select("*").order("mrr_cents", { ascending: false }).order("id")
      .limit(100).returns<LeaderboardRow[]>(),
    marketplace.select("*").order("listed_at", { ascending: false }).order("id")
      .limit(10).returns<MarketplaceRow[]>(),
    marketplace.select("*").gte("listed_at", weekAgo).not("multiple", "is", null).order("multiple").order("id")
      .limit(10).returns<MarketplaceRow[]>(),
    supabase.from("activity_feed").select("*").order("published_at", { ascending: false }).order("id")
      .limit(6).returns<FeedRow[]>(),
  ]);
  const listing = (row: MarketplaceRow) => {
    const card = marketplaceCard(row);
    return {
      name: card.name, category: card.category, logo: card.logo, revenue: card.revenueLabel,
      price: card.priceLabel, multiple: card.multiple === null ? "—" : `${card.multiple.toFixed(1)}x`,
      private: card.private, featured: card.featured,
    };
  };
  return {
    startups: (leaderboard.data ?? []).map((row, index) => ({
      rank: index + 1, name: row.name, description: row.description ?? "", logo: row.logo ?? "",
      founder: row.founder ?? "-", avatar: row.avatar ?? "", private: row.anonymous, sale: row.for_sale,
      mrr: dollars.format(row.mrr_cents / 100),
      growth: row.mrr_growth_pct === null ? "—" : `${Math.abs(row.mrr_growth_pct)}%`,
      negative: (row.mrr_growth_pct ?? 0) < 0,
      includesNonrecurring: row.includes_nonrecurring,
    })),
    recent: (recent.data ?? []).map(listing),
    deals: (deals.data ?? []).map(listing),
    feed: feed.data ?? [],
    failed: Boolean(leaderboard.error || recent.error || deals.error || feed.error),
  };
}
