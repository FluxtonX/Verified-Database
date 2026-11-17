"use client";

import { useRouter } from "next/navigation";
import { sellerUrl, type DashboardMode } from "@/lib/seller-dashboard";
import { buyerUrl } from "@/lib/buyer-dashboard";

export default function DashboardModeSwitch({ mode }: { mode: DashboardMode }) {
  const router = useRouter();
  return <div className="dashboard-mode" role="group" aria-label="Dashboard mode">
    {(["buyer", "seller"] as const).map(next => <button key={next} type="button" aria-pressed={mode === next} onClick={() => {
      if (mode !== next) router.push(next === "buyer" ? buyerUrl() : sellerUrl("my-startups"));
    }}>{next === "buyer" ? "Buyer" : "Seller"}</button>)}
  </div>;
}
