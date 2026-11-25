import "server-only";
import type { FeedRow, MarketplaceCardData, readHome } from "@/lib/catalog";

/*
 * Fictional sample content, used only when Supabase isn't configured (local preview).
 * Every name, founder and figure here is invented. Don't add real companies or people.
 * Imported by server components only, so it never ships in the browser bundle.
 */

type HomeCatalog = Awaited<ReturnType<typeof readHome>>;

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const short = (value: number) => value >= 1e6 ? `$${(value / 1e6).toFixed(1).replace(/\.0$/, "")}M`
  : value >= 1e3 ? `$${(value / 1e3).toFixed(1).replace(/\.0$/, "")}k` : `$${Math.round(value)}`;

type Seed = {
  id: string; name: string; category: string; description: string; revenue: number; price: number;
  growth: number | null; featured?: boolean; anonymous?: boolean; mobile?: boolean; listedDaysAgo: number;
};

const seeds: Seed[] = [
  { id: "sample-inkwell", name: "Inkwell", category: "Productivity", description: "Writing workspace for indie authors with chapter goals and export to EPUB.", revenue: 4200, price: 120000, growth: 6, featured: true, listedDaysAgo: 2 },
  { id: "sample-shipnote", name: "ShipNote", category: "Developer Tools", description: "Changelog widget and release notes for small SaaS teams.", revenue: 1850, price: 45000, growth: 12, listedDaysAgo: 4 },
  { id: "sample-confidential-ai", name: "Unnamed Company", category: "Artificial Intelligence", description: "AI support inbox for Shopify stores. Details shared with serious buyers.", revenue: 9600, price: 260000, growth: -2, anonymous: true, listedDaysAgo: 5 },
  { id: "sample-formcat", name: "Formcat", category: "SaaS", description: "Form builder with Stripe payments and Zapier sync.", revenue: 2700, price: 58000, growth: 3, listedDaysAgo: 9 },
  { id: "sample-pingpal", name: "PingPal", category: "Analytics", description: "Uptime and status pages for agencies managing client sites.", revenue: 760, price: 14000, growth: 18, listedDaysAgo: 12 },
  { id: "sample-tidyreceipts", name: "Tidy Receipts", category: "Fintech", description: "Mobile app that turns receipt photos into bookkeeping entries.", revenue: 1300, price: 30000, growth: null, mobile: true, listedDaysAgo: 20 },
];

const listedAt = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

export const sampleListings: MarketplaceCardData[] = seeds.map(seed => {
  const multiple = Math.round((seed.price / (seed.revenue * 12)) * 10) / 10;
  return {
    id: seed.id,
    name: seed.name,
    category: seed.category,
    description: seed.description,
    logo: "",
    private: Boolean(seed.anonymous),
    featured: Boolean(seed.featured),
    views: "0",
    offers: 0,
    price: seed.price,
    priceLabel: short(seed.price),
    oldPrice: "",
    revenue: seed.revenue,
    revenueLabel: short(seed.revenue),
    mrr: Math.round(seed.revenue * 0.9),
    growth: seed.growth,
    multiple,
    margin: null,
    listedAt: listedAt(seed.listedDaysAgo),
    foundedOn: null,
    country: null,
    audience: null,
    mobileApp: seed.mobile ?? false,
  };
});

const leaders: { name: string; founder: string; description: string; mrr: number; growth: number | null; sale?: boolean; anonymous?: boolean }[] = [
  { name: "Ledgerly", founder: "Ana Ruiz", description: "Invoicing for freelancers in 30 currencies.", mrr: 48200, growth: 7 },
  { name: "Draftbird", founder: "Tom Becker", description: "Email drafts written from your CRM notes.", mrr: 21900, growth: 11 },
  { name: "Anonymous startup", founder: "-", description: "", mrr: 15400, growth: 4, anonymous: true },
  { name: "Inkwell", founder: "Maya Rossi", description: "Writing workspace for indie authors.", mrr: 3780, growth: 6, sale: true },
  { name: "Formcat", founder: "Jon Okafor", description: "Form builder with Stripe payments.", mrr: 2430, growth: 3, sale: true },
  { name: "ShipNote", founder: "Lena Park", description: "Changelog widget for small SaaS teams.", mrr: 1665, growth: 12, sale: true },
  { name: "PingPal", founder: "Sam Ortiz", description: "Uptime and status pages for agencies.", mrr: 684, growth: null, sale: true },
];

const samplePosts: FeedRow[] = [
  { author: "Maya Rossi", project: "Inkwell", body: "Crossed $4k in monthly revenue. Annual plans are now 40% of new signups." },
  { author: "Lena Park", project: "ShipNote", body: "Listed ShipNote today. Looking for a buyer who’ll keep the free tier alive for students." },
  { author: "Jon Okafor", project: "Formcat", body: "Shipped the Zapier integration. Churn went from 6% to 4.1% in a month." },
].map((post, index) => ({
  id: `sample-post-${index + 1}`, avatar: null, logo: null, image_url: null, likes: 0, liked: false,
  published_at: listedAt(index + 1), ...post,
}));

const homeListing = (card: MarketplaceCardData) => ({
  id: card.id as string | undefined, name: card.name, category: card.category, logo: card.logo,
  revenue: card.revenueLabel, price: card.priceLabel, multiple: card.multiple === null ? "—" : `${card.multiple.toFixed(1)}x`,
  multipleValue: card.multiple, private: card.private, featured: card.featured,
});

export function sampleHome(): HomeCatalog {
  return {
    startups: leaders.map((leader, index) => ({
      rank: index + 1, name: leader.name, description: leader.description, logo: "", founder: leader.founder, avatar: "",
      private: Boolean(leader.anonymous), sale: Boolean(leader.sale), mrr: usd.format(leader.mrr), mrrValue: leader.mrr,
      growth: leader.growth === null ? "—" : `${Math.abs(leader.growth)}%`, negative: (leader.growth ?? 0) < 0,
      includesNonrecurring: false, measuredOn: null,
    })),
    recent: [...sampleListings].sort((a, b) => (b.listedAt ?? "").localeCompare(a.listedAt ?? "")).map(homeListing),
    deals: [...sampleListings].sort((a, b) => (a.multiple ?? 99) - (b.multiple ?? 99)).map(homeListing),
    feed: samplePosts,
    failed: false,
  };
}
