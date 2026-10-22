import type { Startup } from "@/data/startups";
import { totalRevenue } from "@/data/startups";

export interface Listing extends Startup {
  /** Yearly profit in $ millions. */
  profit: number;
  /** Asking price in $ millions. */
  askingPrice: number;
  verified: boolean;
  teamSize: number;
  stack: string[];
  reason: string;
  includes: string[];
  listedDaysAgo: number;
  growthYoY: number;
}

export const LISTINGS: Listing[] = [
  {
    id: "pixelpress",
    name: "PixelPress",
    logo: "🖼️",
    category: "AI",
    tagline: "AI product photos for online store owners",
    founded: 2022,
    hq: "Lisbon, Portugal",
    how: "Store owners pay a monthly plan to turn plain photos into polished product shots. Heavier users buy extra image credits, and a few pay once for bulk packs.",
    revenue: { subscription: 0.31, usage: 0.05, onetime: 0.02 },
    profit: 0.24,
    askingPrice: 0.85,
    verified: true,
    teamSize: 2,
    stack: ["Next.js", "Postgres", "Stripe", "Replicate"],
    reason: "The founder is starting a new company and can no longer give this the time it needs.",
    includes: ["Source code and domain", "Stripe account and subscribers", "3 months of founder support", "Social accounts (14k followers)"],
    listedDaysAgo: 3,
    growthYoY: 0.42,
  },
  {
    id: "invoicenest",
    name: "InvoiceNest",
    logo: "🧾",
    category: "Fintech",
    tagline: "Simple invoicing and payments for freelancers",
    founded: 2020,
    hq: "Austin, USA",
    how: "Freelancers pay a small monthly fee to send invoices and track payments. InvoiceNest also keeps a small cut when clients pay an invoice by card.",
    revenue: { subscription: 0.54, transaction: 0.09 },
    profit: 0.39,
    askingPrice: 1.6,
    verified: true,
    teamSize: 3,
    stack: ["Rails", "Postgres", "Stripe Connect"],
    reason: "Growth has plateaued and the founders want to focus on a different product.",
    includes: ["Source code and domain", "Stripe Connect account", "Customer list (aggregate)", "6 months of support"],
    listedDaysAgo: 9,
    growthYoY: 0.18,
  },
  {
    id: "templatehub",
    name: "TemplateHub",
    logo: "🎨",
    category: "Design",
    tagline: "Ready-made website and slide templates",
    founded: 2019,
    hq: "Toronto, Canada",
    how: "Most money comes from people buying templates once. A smaller part is an all-access subscription, and some money comes from ads on free templates.",
    revenue: { onetime: 0.41, subscription: 0.06, ads: 0.03 },
    profit: 0.33,
    askingPrice: 0.9,
    verified: true,
    teamSize: 1,
    stack: ["Astro", "Lemon Squeezy", "Cloudflare"],
    reason: "One-person business and the founder wants to move on after five years.",
    includes: ["Website and all templates", "Lemon Squeezy store", "Email list (22k)", "Designer contacts"],
    listedDaysAgo: 14,
    growthYoY: 0.09,
  },
  {
    id: "codecrate",
    name: "CodeCrate",
    logo: "📦",
    category: "Developer tools",
    tagline: "A simple API to turn code into shareable demos",
    founded: 2021,
    hq: "Berlin, Germany",
    how: "Developers pay for what they use, such as the number of demos rendered each month. A smaller group takes a fixed monthly plan for predictable costs.",
    revenue: { usage: 0.28, subscription: 0.12 },
    profit: 0.21,
    askingPrice: 1.1,
    verified: true,
    teamSize: 2,
    stack: ["Go", "Redis", "AWS", "Stripe Billing"],
    reason: "Founders received a job offer and want a clean handover.",
    includes: ["Source code and infrastructure", "Stripe account", "API docs and community", "4 months of support"],
    listedDaysAgo: 5,
    growthYoY: 0.55,
  },
  {
    id: "fitloop",
    name: "FitLoop",
    logo: "🏃",
    category: "Health",
    tagline: "Bite-size home workouts for busy people",
    founded: 2021,
    hq: "Bangalore, India",
    how: "Users pay a monthly plan to unlock all workouts. Free users see ads, and some buy one-off programmes like a 30-day challenge.",
    revenue: { subscription: 0.19, ads: 0.07, onetime: 0.04 },
    profit: 0.12,
    askingPrice: 0.45,
    verified: false,
    teamSize: 2,
    stack: ["React Native", "Firebase", "RevenueCat"],
    reason: "The team is moving into a different health niche.",
    includes: ["App source and store accounts", "Content library", "Email list (9k)"],
    listedDaysAgo: 2,
    growthYoY: 0.25,
  },
  {
    id: "schoolspark",
    name: "SchoolSpark",
    logo: "🎓",
    category: "Education",
    tagline: "Online course platform built for small schools",
    founded: 2018,
    hq: "Dublin, Ireland",
    how: "Schools sign yearly contracts for the platform, which is the biggest source of money. Individual teachers add a monthly plan.",
    revenue: { licensing: 0.33, subscription: 0.15 },
    profit: 0.27,
    askingPrice: 1.3,
    verified: true,
    teamSize: 4,
    stack: ["Django", "Postgres", "Stripe Invoicing"],
    reason: "The founders are retiring from the business.",
    includes: ["Source code and domain", "School contracts (transferable)", "Support team handover", "12 months of support"],
    listedDaysAgo: 21,
    growthYoY: 0.12,
  },
  {
    id: "dealdrip",
    name: "DealDrip",
    logo: "🏷️",
    category: "Media",
    tagline: "Coupon and deals site with 400k monthly readers",
    founded: 2017,
    hq: "London, UK",
    how: "Money comes from ads on the site and from commissions when readers buy through affiliate links. There is no subscription.",
    revenue: { ads: 0.26, transaction: 0.18 },
    profit: 0.31,
    askingPrice: 0.75,
    verified: false,
    teamSize: 1,
    stack: ["WordPress", "Cloudflare", "AdSense"],
    reason: "The owner has other businesses and wants to simplify.",
    includes: ["Website and content", "Affiliate accounts", "Newsletter list (31k)"],
    listedDaysAgo: 30,
    growthYoY: -0.05,
  },
  {
    id: "meetnotes",
    name: "MeetNotes",
    logo: "🗒️",
    category: "Productivity",
    tagline: "Automatic meeting notes for small teams",
    founded: 2023,
    hq: "Amsterdam, Netherlands",
    how: "Teams pay per person each month. Larger customers pay for extra recording hours based on how much they use, and one agency has a yearly contract.",
    revenue: { subscription: 0.22, usage: 0.08, licensing: 0.05 },
    profit: 0.14,
    askingPrice: 0.7,
    verified: true,
    teamSize: 2,
    stack: ["Next.js", "Supabase", "Whisper", "Stripe"],
    reason: "Founders want to concentrate on another idea.",
    includes: ["Source code and domain", "Stripe account", "2 months of support"],
    listedDaysAgo: 7,
    growthYoY: 0.8,
  },
];

export const getListing = (id: string): Listing | undefined =>
  LISTINGS.find((l) => l.id === id);

export const listingRevenue = (l: Listing): number => totalRevenue(l);

/** Asking price divided by yearly profit, e.g. 3.5 means "3.5x profit". */
export const profitMultiple = (l: Listing): number => l.askingPrice / l.profit;

export const margin = (l: Listing): number => l.profit / totalRevenue(l);

export const LISTING_CATEGORIES = Array.from(new Set(LISTINGS.map((l) => l.category))).sort();

export const usd = (n: number): string => `$${Math.round(n).toLocaleString("en-US")}`;
