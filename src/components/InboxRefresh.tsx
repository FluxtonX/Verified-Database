"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { realtimeToken } from "@/app/dashboard/realtime-actions";

/**
 * Keeps the inbox current: re-renders as soon as a message arrives in one of your conversations
 * (Supabase Realtime, filtered by RLS), with a slow refresh as a fallback if the live link drops.
 */
export default function InboxRefresh() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [live, setLive] = useState(false);
  const refreshTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    let stopped = false;
    let cleanup = () => {};
    const refresh = () => {
      window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => { if (!document.hidden) router.refresh(); }, 300);
    };
    const liveRef = { current: false };
    const fallback = window.setInterval(() => { if (!document.hidden && !liveRef.current) router.refresh(); }, 60_000);

    (async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      const token = url && key ? await realtimeToken().catch(() => null) : null;
      if (stopped || !url || !key || !token) return;
      const { createClient } = await import("@supabase/supabase-js");
      const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      client.realtime.setAuth(token);
      const channel = client.channel("inbox")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "seller_lead_messages" }, refresh)
        .subscribe(status => {
          liveRef.current = status === "SUBSCRIBED";
          if (!stopped) setLive(liveRef.current);
        });
      // Access tokens expire after about an hour; renew before that.
      const renew = window.setInterval(async () => {
        const next = await realtimeToken().catch(() => null);
        if (next) client.realtime.setAuth(next);
      }, 45 * 60_000);
      cleanup = () => { window.clearInterval(renew); client.removeChannel(channel); };
      if (stopped) cleanup();
    })();

    return () => { stopped = true; window.clearInterval(fallback); window.clearTimeout(refreshTimer.current); cleanup(); };
  }, [router]);

  return <span className="inbox-refresh">
    <span className={`inbox-live${live ? " on" : ""}`} title={live ? "New messages appear automatically" : "Checking for new messages every minute"}>
      <span aria-hidden="true" />{live ? "Live" : "Auto-refresh"}
    </span>
    <button className="seller-button" disabled={pending} onClick={() => start(() => router.refresh())}>{pending ? "Refreshing…" : "Refresh inbox"}</button>
  </span>;
}
