"use client";
import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
export default function InboxRefresh() {
  const router = useRouter();
  const [pending, start] = useTransition();
  useEffect(() => {
    const interval = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, 15000);
    return () => clearInterval(interval);
  }, [router]);
  return <button className="seller-button" disabled={pending} onClick={() => start(() => router.refresh())}>{pending ? "Refreshing…" : "Refresh inbox"}</button>;
}
