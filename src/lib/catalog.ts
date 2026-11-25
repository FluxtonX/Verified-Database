import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { createSupabase } from "./supabase/server";
import { publicSupabase } from "./supabase/public";
import { pageSize, searchTerm, type MarketplaceFilters } from "./marketplace-filters";

export const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const compactDollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const compactCount = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export type MarketplaceRow = {
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

// Categories change only through migrations; cache them for a day. Errors throw so they aren't cached.
const cachedCategories = unstable_cache(async () => {
  const supabase = publicSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase.from("categories").select("name").order("name").returns<{ name: string }[]>();
  if (error) throw error;
  return data.map(category => category.name);
}, ["categories"], { revalidate: 86_400 });

export async function readCategories() {
  try {
    return { categories: await cachedCategories(), failed: false };
  } catch {
    return { categories: [] as string[], failed: true };
  }
}

export async function catalogContext() {
  const supabase = await createSupabase();
  if (!supabase) return null;

  const [session, { categories, failed }] = await Promise.all([supabase.auth.getClaims(), readCategories()]);
  return { supabase, signedIn: Boolean(session.data?.claims.sub), categories, failed };
}

/** One page of the marketplace, filtered and sorted in the database. */
export async function queryMarketplace(supabase: SupabaseClient, f: MarketplaceFilters) {
  const cents = (value: string) => Math.round(Number(value) * 100);
  let query = supabase.from("marketplace").select("*", { count: "exact" });
  const term = searchTerm(f.q);
  if (term) query = query.or(`name.ilike."*${term}*",description.ilike."*${term}*",category.ilike."*${term}*"`);
  if (f.category) query = query.eq("category", f.category);
  if (f.revenueMin) query = query.gte("revenue_30d_cents", cents(f.revenueMin));
  if (f.revenueMax) query = query.lte("revenue_30d_cents", cents(f.revenueMax));
  if (f.mrrMin) query = query.gte("mrr_cents", cents(f.mrrMin));
  if (f.mrrMax) query = query.lte("mrr_cents", cents(f.mrrMax));
  if (f.growthMin) query = query.gte("revenue_growth_pct", Number(f.growthMin));
  if (f.growthMax) query = query.lte("revenue_growth_pct", Number(f.growthMax));
  if (f.priceMin) query = query.gte("asking_price_cents", cents(f.priceMin));
  if (f.priceMax) query = query.lte("asking_price_cents", cents(f.priceMax));
  if (f.marginMin) query = query.gte("profit_margin_pct", Number(f.marginMin));
  if (f.marginMax) query = query.lte("profit_margin_pct", Number(f.marginMax));
  if (f.maxMultiple) query = query.lte("multiple", Number(f.maxMultiple));
  if (f.audience) query = query.in("audience", [f.audience, "Both"]);
  if (f.mobile) query = query.eq("mobile_app", f.mobile === "yes");
  if (f.listed) query = query.gte("listed_at", new Date(Date.now() - Number(f.listed) * 86_400_000).toISOString());
  if (f.foundedFrom) query = query.gte("founded_on", f.foundedFrom);
  if (f.foundedTo) query = query.lte("founded_on", f.foundedTo);
  if (f.country) query = query.eq("country", f.country);
  const [field, direction] = f.sort.split("-");
  const column = ({ price: "asking_price_cents", multiple: "multiple", revenue: "revenue_30d_cents", growth: "revenue_growth_pct",
    listed: "listed_at", founded: "founded_on" } as Record<string, string>)[field];
  query = column
    ? query.order(column, { ascending: direction === "asc", nullsFirst: false })
    : query.order("featured", { ascending: false }).order("multiple", { ascending: true, nullsFirst: false });
  const from = (f.page - 1) * pageSize;
  const { data, count, error } = await query.order("id").range(from, from + pageSize - 1).returns<MarketplaceRow[]>();
  // Asking for a page past the end returns an error from PostgREST; treat it as an empty page.
  if (error && error.code !== "PGRST103") return null;
  return { rows: (data ?? []).map(marketplaceCard), total: count ?? 0 };
}

/** Totals for the marketplace header, from two small numeric columns rather than whole rows. */
export async function marketplaceStats(supabase: SupabaseClient) {
  const { data, error } = await supabase.from("marketplace").select("revenue_30d_cents,multiple").limit(10_000)
    .returns<{ revenue_30d_cents: number; multiple: number | null }[]>();
  if (error) return null;
  return {
    listings: data.length,
    revenue: data.reduce((sum, row) => sum + row.revenue_30d_cents, 0) / 100,
    multiples: data.flatMap(row => row.multiple ?? []),
  };
}

/** Specific listings by ID (saved startups). */
export async function readListings(supabase: SupabaseClient, ids: string[]) {
  if (!ids.length) return [];
  const { data, error } = await supabase.from("marketplace").select("*").in("id", ids).returns<MarketplaceRow[]>();
  return error ? null : data.map(marketplaceCard);
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
  /** Added by migration 20261125000000; absent on older databases. */
  measured_on?: string | null;
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
      id: card.id as string | undefined,
      name: card.name, category: card.category, logo: card.logo, revenue: card.revenueLabel,
      price: card.priceLabel, multiple: card.multiple === null ? "—" : `${card.multiple.toFixed(1)}x`,
      multipleValue: card.multiple,
      private: card.private, featured: card.featured,
    };
  };
  return {
    startups: (leaderboard.data ?? []).map((row, index) => ({
      rank: index + 1, name: row.name, description: row.description ?? "", logo: row.logo ?? "",
      founder: row.founder ?? "-", avatar: row.avatar ?? "", private: row.anonymous, sale: row.for_sale,
      mrr: dollars.format(row.mrr_cents / 100),
      mrrValue: row.mrr_cents / 100,
      growth: row.mrr_growth_pct === null ? "—" : `${Math.abs(row.mrr_growth_pct)}%`,
      negative: (row.mrr_growth_pct ?? 0) < 0,
      includesNonrecurring: row.includes_nonrecurring,
      measuredOn: row.measured_on ? shortDate.format(new Date(`${row.measured_on}T00:00:00Z`)) : null,
    })),
    recent: (recent.data ?? []).map(listing),
    deals: (deals.data ?? []).map(listing),
    feed: feed.data ?? [],
    failed: Boolean(leaderboard.error || recent.error || deals.error || feed.error),
  };
}
