import type { Metadata } from "next";
import AcquireMarketplace from "@/components/AcquireMarketplace";

export const metadata: Metadata = {
  title: "Buy and Sell SaaS and Mobile Apps - VerifedDB",
  description: "Acquire profitable startups. Buy and sell SaaS, mobile apps, and digital businesses on a verified marketplace.",
};

export default function AcquirePage() {
  return <AcquireMarketplace />;
}
