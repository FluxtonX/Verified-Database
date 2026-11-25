import type { MarketplaceCardData } from "./catalog";

export const marketplaceSorts = [
  ["default", "Best deals (default)"],
  ["listed-desc", "Listed: Newest First"],
  ["listed-asc", "Listed: Oldest First"],
  ["multiple-asc", "Multiple: Low to High"],
  ["multiple-desc", "Multiple: High to Low"],
  ["price-asc", "Asking Price: Low to High"],
  ["price-desc", "Asking Price: High to Low"],
  ["revenue-asc", "Revenue: Low to High"],
  ["revenue-desc", "Revenue: High to Low"],
  ["growth-asc", "Growth: Low to High"],
  ["growth-desc", "Growth: High to Low"],
  ["founded-asc", "Founded: Oldest First"],
  ["founded-desc", "Founded: Newest First"],
] as const;

/** Marketplace filters as they appear in the URL (`/acquire?revenue_min=1000&sort=price-asc`). */
export type MarketplaceFilters = {
  q: string;
  category: string;
  revenueMin: string; revenueMax: string;
  mrrMin: string; mrrMax: string;
  growthMin: string; growthMax: string;
  priceMin: string; priceMax: string;
  marginMin: string; marginMax: string;
  maxMultiple: string;
  audience: "" | "B2B" | "B2C";
  mobile: "" | "yes" | "no";
  listed: "" | "7" | "30" | "90";
  foundedFrom: string; foundedTo: string;
  country: string;
  sort: string;
  page: number;
};

export const pageSize = 24;

const keys: Record<Exclude<keyof MarketplaceFilters, "page">, string> = {
  q: "q", category: "category",
  revenueMin: "revenue_min", revenueMax: "revenue_max", mrrMin: "mrr_min", mrrMax: "mrr_max",
  growthMin: "growth_min", growthMax: "growth_max", priceMin: "price_min", priceMax: "price_max",
  marginMin: "margin_min", marginMax: "margin_max", maxMultiple: "max_multiple",
  audience: "audience", mobile: "mobile", listed: "listed",
  foundedFrom: "founded_from", foundedTo: "founded_to", country: "country", sort: "sort",
};

export const emptyFilters: MarketplaceFilters = {
  q: "", category: "", revenueMin: "", revenueMax: "", mrrMin: "", mrrMax: "", growthMin: "", growthMax: "",
  priceMin: "", priceMax: "", marginMin: "", marginMax: "", maxMultiple: "", audience: "", mobile: "", listed: "",
  foundedFrom: "", foundedTo: "", country: "", sort: "default", page: 1,
};

const number = (value: string) => /^-?\d{1,13}(\.\d{1,2})?$/.test(value) ? value : "";
const date = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) ? value : "";
const pick = <T extends string>(value: string, allowed: readonly T[]) => (allowed as readonly string[]).includes(value) ? value as T : "" as T;

/** Parse and validate untrusted URL parameters. Anything invalid falls back to "no filter". */
export function parseFilters(params: Record<string, string | string[] | undefined>): MarketplaceFilters {
  const get = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value ?? "").trim();
  };
  const page = Number(get("page"));
  return {
    q: get(keys.q).slice(0, 100),
    category: get(keys.category).slice(0, 100),
    revenueMin: number(get(keys.revenueMin)), revenueMax: number(get(keys.revenueMax)),
    mrrMin: number(get(keys.mrrMin)), mrrMax: number(get(keys.mrrMax)),
    growthMin: number(get(keys.growthMin)), growthMax: number(get(keys.growthMax)),
    priceMin: number(get(keys.priceMin)), priceMax: number(get(keys.priceMax)),
    marginMin: number(get(keys.marginMin)), marginMax: number(get(keys.marginMax)),
    maxMultiple: number(get(keys.maxMultiple)),
    audience: pick(get(keys.audience), ["B2B", "B2C"] as const),
    mobile: pick(get(keys.mobile), ["yes", "no"] as const),
    listed: pick(get(keys.listed), ["7", "30", "90"] as const),
    foundedFrom: date(get(keys.foundedFrom)), foundedTo: date(get(keys.foundedTo)),
    country: /^[A-Z]{2}$/.test(get(keys.country)) ? get(keys.country) : "",
    sort: marketplaceSorts.some(([value]) => value === get(keys.sort)) ? get(keys.sort) : "default",
    page: Number.isInteger(page) && page >= 1 && page <= 1000 ? page : 1,
  };
}

/** Build the query string, leaving out defaults so URLs stay short. */
export function filtersToSearch(filters: MarketplaceFilters) {
  const search = new URLSearchParams();
  for (const [field, key] of Object.entries(keys) as [keyof typeof keys, string][]) {
    const value = filters[field];
    if (value && !(field === "sort" && value === "default")) search.set(key, value);
  }
  if (filters.page > 1) search.set("page", String(filters.page));
  const text = search.toString();
  return text ? `?${text}` : "";
}

export const activeFilterCount = (filters: MarketplaceFilters) =>
  (Object.keys(keys) as (keyof typeof keys)[]).filter(field => field !== "sort" && field !== "q" && filters[field]).length;

/** Text safe to embed in a PostgREST `or=(…)` filter value. */
export const searchTerm = (q: string) => q.replace(/[,()"*%\\]/g, " ").replace(/\s+/g, " ").trim();

/** In-memory version of the database filters, used for the fictional sample listings. */
export function filterListings(rows: MarketplaceCardData[], f: MarketplaceFilters, now = Date.now()) {
  const within = (value: number | null, min: string, max: string, scale = 1) =>
    (!min && !max) || (value !== null && (!min || value >= Number(min) * scale) && (!max || value <= Number(max) * scale));
  const term = searchTerm(f.q).toLowerCase();
  const filtered = rows.filter(row =>
    (!term || `${row.name} ${row.description} ${row.category}`.toLowerCase().includes(term)) &&
    (!f.category || row.category === f.category) &&
    within(row.revenue, f.revenueMin, f.revenueMax) && within(row.mrr, f.mrrMin, f.mrrMax) &&
    within(row.growth, f.growthMin, f.growthMax) && within(row.price, f.priceMin, f.priceMax) &&
    within(row.margin, f.marginMin, f.marginMax) &&
    (!f.maxMultiple || (row.multiple !== null && row.multiple <= Number(f.maxMultiple))) &&
    (!f.audience || row.audience === f.audience || row.audience === "Both") &&
    (!f.mobile || row.mobileApp === (f.mobile === "yes")) &&
    (!f.listed || (row.listedAt !== null && Date.parse(row.listedAt) >= now - Number(f.listed) * 86_400_000)) &&
    (!f.foundedFrom || (row.foundedOn !== null && row.foundedOn >= f.foundedFrom)) &&
    (!f.foundedTo || (row.foundedOn !== null && row.foundedOn <= f.foundedTo)) &&
    (!f.country || row.country === f.country));
  const [field, direction] = f.sort.split("-");
  const value = (row: MarketplaceCardData) => ({
    price: row.price, multiple: row.multiple, revenue: row.revenue, growth: row.growth, listed: row.listedAt, founded: row.foundedOn,
  } as Record<string, string | number | null>)[field];
  const sorted = f.sort === "default"
    ? filtered.sort((a, b) => Number(b.featured) - Number(a.featured) || (a.multiple ?? Infinity) - (b.multiple ?? Infinity))
    : filtered.sort((a, b) => {
      const left = value(a), right = value(b);
      if (left === right) return 0;
      if (left === null) return 1;
      if (right === null) return -1;
      return (left < right ? -1 : 1) * (direction === "asc" ? 1 : -1);
    });
  return { rows: sorted.slice((f.page - 1) * pageSize, f.page * pageSize), total: sorted.length };
}
