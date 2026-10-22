"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { RevenueTypeId } from "@/data/startups";

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

/**
 * A tiny browser-storage list used as a stand-in for a database while the
 * backend does not exist yet. Swap this for real API calls later.
 */
export function useStored<T>(
  key: string,
  initialDefault: T[] = []
): [T[], (next: T[] | ((prev: T[]) => T[])) => void] {
  const raw = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(key) ?? JSON.stringify(initialDefault),
    () => JSON.stringify(initialDefault),
  );

  const items = useMemo(() => {
    try {
      return JSON.parse(raw) as T[];
    } catch {
      return initialDefault;
    }
  }, [raw, initialDefault]);

  const set = useCallback(
    (next: T[] | ((prev: T[]) => T[])) => {
      const nextVal = typeof next === "function" ? (next as (prev: T[]) => T[])(items) : next;
      localStorage.setItem(key, JSON.stringify(nextVal));
      listeners.forEach((l) => l());
    },
    [key, items],
  );

  return [items, set];
}

export interface Offer {
  id: string;
  listingId: string;
  listingName: string;
  amount: number;
  email: string;
  message: string;
  createdAt: string;
  status: "pending" | "accepted" | "declined";
  isReceived?: boolean;
}

export interface UserStartup {
  id: string;
  name: string;
  logo: string;
  category: string;
  tagline: string;
  founded: number;
  hq: string;
  how: string;
  revenue: Partial<Record<RevenueTypeId, number>>;
  isForSale: boolean;
  askingPrice?: number;
  profit?: number;
  verified: boolean;
  verificationStatus: "unverified" | "pending" | "verified" | "rejected";
  stripeKeyHint?: string;
  teamSize?: number;
  stack?: string[];
  includes?: string[];
  reason?: string;
  createdAt: string;
}

export const OFFERS_KEY = "tl_offers";
export const SAVED_KEY = "tl_saved";
export const MY_STARTUPS_KEY = "tl_my_startups";
export const VERIFICATION_QUEUE_KEY = "tl_verifications";

// Sample initial data for demo demonstration if none exists yet
export const DEFAULT_MY_STARTUPS: UserStartup[] = [
  {
    id: "user-saas-1",
    name: "DocuFlow AI",
    logo: "📑",
    category: "AI",
    tagline: "Contract summarizer & signature tracker for legal teams",
    founded: 2023,
    hq: "Austin, USA",
    how: "Law firms pay a monthly seat subscription, plus usage fees for processing documents over 50 pages.",
    revenue: {
      subscription: 0.18,
      usage: 0.04,
      onetime: 0.01,
    },
    isForSale: true,
    askingPrice: 0.65,
    profit: 0.15,
    verified: true,
    verificationStatus: "verified",
    stripeKeyHint: "rk_live_...94b2",
    teamSize: 2,
    stack: ["Next.js", "Python", "Stripe", "Postgres"],
    includes: ["Source code & domain", "Active Stripe subscribers (420 paying firms)", "Handover assistance"],
    reason: "Solo founder moving to another healthcare AI venture.",
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
  },
];

export const DEFAULT_OFFERS: Offer[] = [
  {
    id: "off-demo-1",
    listingId: "user-saas-1",
    listingName: "DocuFlow AI",
    amount: 600000,
    email: "sarah.investments@apollo-syndicate.io",
    message: "Hi! Love the high recurring margin. We can close within 14 days with full cash in escrow.",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: "pending",
    isReceived: true,
  },
  {
    id: "off-demo-2",
    listingId: "user-saas-1",
    listingName: "DocuFlow AI",
    amount: 520000,
    email: "m&a@microventures.co",
    message: "We are interested in acquiring DocuFlow as an add-on to our legal tech suite.",
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    status: "pending",
    isReceived: true,
  },
];

export interface DealCheckpoint {
  id: string;
  title: string;
  desc: string;
  done: boolean;
  completedAt?: string;
}

export interface DealMessage {
  id: string;
  sender: "founder" | "buyer" | "system";
  text: string;
  time: string;
}

export interface Deal {
  id: string;
  offerId: string;
  listingId: string;
  listingName: string;
  buyerEmail: string;
  sellerEmail: string;
  amount: number;
  stage: number; // 1 to 5
  escrowStatus: "awaiting_deposit" | "funds_secured" | "in_inspection" | "funds_released";
  checkpoints: DealCheckpoint[];
  messages: DealMessage[];
  createdAt: string;
  updatedAt: string;
}

export const DEALS_KEY = "tl_deals";

export const DEFAULT_DEAL_CHECKPOINTS: DealCheckpoint[] = [
  {
    id: "agreement",
    title: "1. Asset Purchase Agreement (APA)",
    desc: "Digital signature on mutual IP assignment, non-compete, and escrow release terms.",
    done: true,
    completedAt: "Signed by Founder & Buyer",
  },
  {
    id: "escrow_deposit",
    title: "2. Escrow Deposit Funded",
    desc: "Buyer transfers agreed purchase price to TrustLedger Escrow Vault. Held safely until sign-off.",
    done: true,
    completedAt: "Funds Secured in Escrow",
  },
  {
    id: "domain_transfer",
    title: "3. Domain Name Transfer",
    desc: "Domain registrar auth code transferred and DNS configuration verified by buyer.",
    done: false,
  },
  {
    id: "code_transfer",
    title: "4. Codebase & Cloud Infrastructure",
    desc: "GitHub repository ownership transferred, Vercel/AWS production access granted.",
    done: false,
  },
  {
    id: "stripe_transfer",
    title: "5. Stripe Account & Customer Handover",
    desc: "Payment processing credentials reassigned so MRR deposits to buyer's payout bank.",
    done: false,
  },
  {
    id: "inspection",
    title: "6. Technical Verification Window (7-day)",
    desc: "Buyer confirms application uptime, recurring billing test, and code integrity.",
    done: false,
  },
  {
    id: "escrow_release",
    title: "7. Escrow Release & Final Settlement",
    desc: "Funds released from escrow directly to founder's verified payout bank. Deal concluded.",
    done: false,
  },
];

export function createInitialDeal(offer: Offer): Deal {
  return {
    id: `deal-${offer.id}`,
    offerId: offer.id,
    listingId: offer.listingId,
    listingName: offer.listingName,
    buyerEmail: offer.email,
    sellerEmail: "founder@trustledger.io",
    amount: offer.amount,
    stage: 2, // Agreement signed & Escrow deposit funded
    escrowStatus: "funds_secured",
    checkpoints: DEFAULT_DEAL_CHECKPOINTS,
    messages: [
      {
        id: "msg-sys-1",
        sender: "system",
        text: `Closing room created for ${offer.listingName}. Purchase offer of $${offer.amount.toLocaleString()} has been accepted.`,
        time: "Just now",
      },
      {
        id: "msg-sys-2",
        sender: "system",
        text: `Escrow deposit of $${offer.amount.toLocaleString()} is locked in the TrustLedger Vault. Both parties can now begin asset transfer.`,
        time: "Just now",
      },
      {
        id: "msg-buyer-1",
        sender: "buyer",
        text: "Thanks for accepting! Excited to close this acquisition. Ready for domain and GitHub handover whenever you are.",
        time: "Just now",
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
