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
  stage: number;
  escrowStatus: "awaiting_deposit" | "funds_secured" | "in_inspection" | "funds_released";
  checkpoints: DealCheckpoint[];
  messages: DealMessage[];
  createdAt: string;
  updatedAt: string;
}

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
