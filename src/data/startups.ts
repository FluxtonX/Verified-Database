export type RevenueTypeId =
  | "subscription"
  | "ads"
  | "transaction"
  | "onetime"
  | "usage"
  | "licensing";

export interface RevenueType {
  id: RevenueTypeId;
  label: string;
  icon: string;
  color: string;
  short: string;
  explain: string;
  example: string;
}

export const REVENUE_TYPES: RevenueType[] = [
  {
    id: "subscription",
    label: "Subscriptions",
    icon: "🔁",
    color: "#6d5efc",
    short: "Customers pay every month or year",
    explain:
      "People pay a recurring fee to keep using the product, like a Netflix-style plan.",
    example: "Notion Plus plan, Duolingo Super",
  },
  {
    id: "ads",
    label: "Advertising",
    icon: "📣",
    color: "#ff7a45",
    short: "Brands pay to show ads",
    explain:
      "The product is free or cheap for users, and advertisers pay to reach them.",
    example: "Sponsored posts, in-app video ads",
  },
  {
    id: "transaction",
    label: "Transaction fees",
    icon: "💳",
    color: "#12b886",
    short: "A small cut of every payment",
    explain:
      "The startup takes a small percentage each time money moves through its platform.",
    example: "2.9% + 30¢ on every card payment",
  },
  {
    id: "onetime",
    label: "One-time sales",
    icon: "🛍️",
    color: "#f5b301",
    short: "Pay once, own it",
    explain:
      "Customers buy a product, a pack, or an item once instead of subscribing.",
    example: "Printed merch, in-app purchases",
  },
  {
    id: "usage",
    label: "Usage-based",
    icon: "⚡",
    color: "#2f9bff",
    short: "Pay for what you use",
    explain:
      "Customers are billed by how much they use, like API calls, storage or compute.",
    example: "API tokens, bandwidth, build minutes",
  },
  {
    id: "licensing",
    label: "Enterprise & licensing",
    icon: "🏢",
    color: "#e64980",
    short: "Big contracts with companies",
    explain:
      "Large companies sign custom deals, licences or partnerships worth a lot per customer.",
    example: "Company-wide licences, data deals",
  },
];

export interface Startup {
  id: string;
  name: string;
  logo: string;
  category: string;
  tagline: string;
  founded: number;
  hq: string;
  how: string;
  /** Yearly revenue in USD millions, split by type. */
  revenue: Partial<Record<RevenueTypeId, number>>;
}

export const STARTUPS: Startup[] = [
  {
    id: "openai",
    name: "OpenAI",
    logo: "🤖",
    category: "AI",
    tagline: "Makes ChatGPT and powerful AI models",
    founded: 2015,
    hq: "San Francisco, USA",
    how: "Most money comes from people paying for ChatGPT plans. Developers and companies also pay for every request they send to the AI, and a few large partners pay for custom deals.",
    revenue: { subscription: 8000, usage: 4500, licensing: 500 },
  },
  {
    id: "stripe",
    name: "Stripe",
    logo: "💠",
    category: "Fintech",
    tagline: "Online payments for internet businesses",
    founded: 2010,
    hq: "San Francisco, USA",
    how: "Stripe keeps a small cut of every payment made through it. It also charges extra for add-on tools like fraud checks, billing and banking features.",
    revenue: { transaction: 4300, usage: 800 },
  },
  {
    id: "canva",
    name: "Canva",
    logo: "🎨",
    category: "Design",
    tagline: "Easy online design for everyone",
    founded: 2013,
    hq: "Sydney, Australia",
    how: "Millions of people and teams pay a monthly plan for premium design tools. Canva also sells printed products and licenses content and tools to partners.",
    revenue: { subscription: 1700, onetime: 400, licensing: 200 },
  },
  {
    id: "figma",
    name: "Figma",
    logo: "🧩",
    category: "Design",
    tagline: "Design and build products together online",
    founded: 2012,
    hq: "San Francisco, USA",
    how: "Design teams pay per seat each month. Large companies sign bigger yearly contracts for security and admin controls.",
    revenue: { subscription: 640, licensing: 110 },
  },
  {
    id: "midjourney",
    name: "Midjourney",
    logo: "🖼️",
    category: "AI",
    tagline: "Turns text into stunning images",
    founded: 2021,
    hq: "San Francisco, USA",
    how: "Almost all income is monthly plans that give users more image-generation time. There is no advertising.",
    revenue: { subscription: 480, usage: 20 },
  },
  {
    id: "notion",
    name: "Notion",
    logo: "📝",
    category: "Productivity",
    tagline: "Notes, docs and projects in one place",
    founded: 2013,
    hq: "San Francisco, USA",
    how: "Individuals and teams pay monthly or yearly plans. Large companies pay for company-wide deals and an optional paid AI add-on.",
    revenue: { subscription: 400, usage: 50, licensing: 50 },
  },
  {
    id: "duolingo",
    name: "Duolingo",
    logo: "🦉",
    category: "Education",
    tagline: "Learn languages with short daily lessons",
    founded: 2011,
    hq: "Pittsburgh, USA",
    how: "Free learners see ads. Paying learners subscribe to remove ads and unlock extras, and some buy in-app items like gems.",
    revenue: { subscription: 560, ads: 90, onetime: 100 },
  },
  {
    id: "discord",
    name: "Discord",
    logo: "💬",
    category: "Social",
    tagline: "Voice and text chat for communities",
    founded: 2015,
    hq: "San Francisco, USA",
    how: "Chat is free. Money comes from Nitro subscriptions, a shop for profile items, and brand-sponsored quests.",
    revenue: { subscription: 450, onetime: 100, ads: 50 },
  },
  {
    id: "vercel",
    name: "Vercel",
    logo: "▲",
    category: "Developer tools",
    tagline: "Host and ship websites in seconds",
    founded: 2015,
    hq: "San Francisco, USA",
    how: "Teams pay a monthly plan and then extra based on how much traffic and computing their sites use. Big firms sign enterprise contracts.",
    revenue: { subscription: 90, usage: 80, licensing: 30 },
  },
  {
    id: "beehiiv",
    name: "beehiiv",
    logo: "🐝",
    category: "Media",
    tagline: "Newsletter platform for creators",
    founded: 2021,
    hq: "New York, USA",
    how: "Creators pay a monthly plan based on audience size. beehiiv also earns from an ad network and a cut of paid newsletters.",
    revenue: { subscription: 20, ads: 6, transaction: 4 },
  },
];

export const totalRevenue = (s: Startup): number =>
  Object.values(s.revenue).reduce((a, b) => a + (b ?? 0), 0);

/** Format a value in $ millions as $1.2B / $450M. */
export const formatMoney = (millions: number): string => {
  if (millions >= 1000) {
    const b = millions / 1000;
    return `$${b >= 10 ? b.toFixed(0) : b.toFixed(1).replace(/\.0$/, "")}B`;
  }
  if (millions < 1) return `$${Math.round(millions * 1000)}K`;
  if (millions < 10) return `$${millions.toFixed(1).replace(/\.0$/, "")}M`;
  return `$${Math.round(millions)}M`;
};

export const getStartup = (id: string): Startup | undefined =>
  STARTUPS.find((s) => s.id === id);

/** Share (0-1) of a startup's revenue that comes from one type. */
export const share = (s: Startup, t: RevenueTypeId): number =>
  (s.revenue[t] ?? 0) / totalRevenue(s);

export const pct = (x: number): number => Math.round(x * 100);

/** Illustrative year-over-year growth rates (0.4 = +40%). Demo data only. */
const GROWTH_YOY: Record<string, number> = {
  openai: 1.0,
  stripe: 0.28,
  canva: 0.3,
  figma: 0.4,
  midjourney: 0.8,
  notion: 0.35,
  duolingo: 0.4,
  discord: 0.15,
  vercel: 0.55,
  beehiiv: 0.9,
};

export const growthOf = (s: Startup): number => GROWTH_YOY[s.id] ?? 0;

export const LATEST_YEAR = 2025;

/** Four years of total revenue ending at the latest year (in $ millions). */
export function growthSeries(s: Startup): { year: number; value: number }[] {
  const g = growthOf(s);
  const total = totalRevenue(s);
  return [3, 2, 1, 0].map((k) => ({
    year: LATEST_YEAR - k,
    value: total / Math.pow(1 + g, k),
  }));
}

/** Average revenue mix of comparable startups (same category, else everyone else). */
export function peerBenchmark(s: Startup) {
  const sameCategory = STARTUPS.filter((p) => p.id !== s.id && p.category === s.category);
  const peers = sameCategory.length ? sameCategory : STARTUPS.filter((p) => p.id !== s.id);
  const label = sameCategory.length
    ? `other ${s.category} startups`
    : "all other tracked startups";
  const avg = Object.fromEntries(
    REVENUE_TYPES.map((t) => [t.id, peers.reduce((n, p) => n + share(p, t.id), 0) / peers.length]),
  ) as Record<RevenueTypeId, number>;
  return { peers, label, avg };
}

export interface Insight {
  tone: "good" | "warn" | "info";
  title: string;
  text: string;
}

/** Plain-English takeaways a founder can act on, derived from the numbers. */
export function buildInsights(s: Startup): Insight[] {
  const total = totalRevenue(s);
  const entries = REVENUE_TYPES.map((t) => ({ t, v: s.revenue[t.id] ?? 0 }))
    .filter((e) => e.v > 0)
    .sort((a, b) => b.v - a.v);
  const top = entries[0];
  const topShare = top.v / total;
  const predictable = share(s, "subscription") + share(s, "licensing");
  const out: Insight[] = [];

  if (topShare >= 0.85) {
    out.push({
      tone: "warn",
      title: "One stream does almost everything",
      text: `${pct(topShare)}% of revenue comes from ${top.t.label.toLowerCase()}. That keeps things simple, but if this stream slows down the whole business feels it. Adding a second stream is a common way to reduce that risk.`,
    });
  } else if (topShare >= 0.6) {
    out.push({
      tone: "info",
      title: "One main engine, with support",
      text: `${pct(topShare)}% comes from ${top.t.label.toLowerCase()}, with ${entries.length - 1} other stream${entries.length > 2 ? "s" : ""} adding a cushion.`,
    });
  } else {
    out.push({
      tone: "good",
      title: "Revenue is well spread out",
      text: `No single stream is above ${pct(topShare)}%, so a slow quarter in one area is less likely to hurt badly.`,
    });
  }

  if (predictable >= 0.7) {
    out.push({
      tone: "good",
      title: "A predictable base",
      text: `${pct(predictable)}% comes from subscriptions and company contracts. That money repeats without having to sell again each month.`,
    });
  } else {
    out.push({
      tone: "warn",
      title: "Much of the revenue must be re-earned",
      text: `Only ${pct(predictable)}% comes from subscriptions and contracts. The rest depends on new purchases, usage, fees or ads each period, so it is harder to forecast.`,
    });
  }

  const { avg, label } = peerBenchmark(s);
  const gaps = REVENUE_TYPES.map((t) => ({ t, gap: share(s, t.id) - avg[t.id] })).sort(
    (a, b) => Math.abs(b.gap) - Math.abs(a.gap),
  );
  const g = gaps[0];
  if (Math.abs(g.gap) >= 0.1) {
    out.push({
      tone: "info",
      title: `${g.gap > 0 ? "Leans more" : "Leans less"} on ${g.t.label.toLowerCase()}`,
      text: `${s.name} earns ${pct(share(s, g.t.id))}% from ${g.t.label.toLowerCase()}, while ${label} average ${pct(avg[g.t.id])}%.`,
    });
  } else {
    out.push({
      tone: "info",
      title: "Similar mix to its peers",
      text: `${s.name}'s revenue mix is close to the average of ${label}.`,
    });
  }

  return out;
}

