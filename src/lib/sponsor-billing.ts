import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createSupabase } from "@/lib/supabase/server";
import type { SponsorCatalog, SponsorPrice, Sponsorship } from "@/lib/sponsorship";

export function sponsorAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  return url && key ? createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) : null;
}

export function sponsorCheckoutEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SPONSOR_PRICE_ID &&
    process.env.STRIPE_SPONSOR_WEBHOOK_SECRET && process.env.SUPABASE_SECRET_KEY);
}

export async function readSponsorPrice(): Promise<SponsorPrice | null> {
  const id = process.env.STRIPE_SPONSOR_PRICE_ID?.trim();
  if (!id || !/^price_[A-Za-z0-9]+$/.test(id) || !process.env.STRIPE_SECRET_KEY) return null;

  try {
    const price = await stripeRequest<{
      id: string;
      active: boolean;
      currency: string;
      unit_amount: number | null;
      billing_scheme: string;
      recurring: { interval: string; interval_count: number; usage_type: string } | null;
    }>(`prices/${id}`);
    if (price.id !== id || !price.active || price.currency !== "usd" ||
        price.unit_amount === null || !Number.isSafeInteger(price.unit_amount) || price.unit_amount <= 0 ||
        price.billing_scheme !== "per_unit" || price.recurring?.interval !== "month" ||
        price.recurring.interval_count !== 1 || price.recurring.usage_type !== "licensed") return null;

    const label = new Intl.NumberFormat("en-US", {
      style: "currency", currency: price.currency,
      minimumFractionDigits: price.unit_amount % 100 === 0 ? 0 : 2,
    }).format(price.unit_amount / 100);
    return { id, label };
  } catch {
    return null;
  }
}

export async function readSponsorCatalog(supabase: Awaited<ReturnType<typeof createSupabase>>) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("sponsorship_catalog");
  return error ? null : data as SponsorCatalog | null;
}

export async function sponsorAccount() {
  const supabase = await createSupabase();
  const { data } = await supabase?.auth.getUser() ?? {};
  return data?.user ?? null;
}

type Admin = NonNullable<ReturnType<typeof sponsorAdmin>>;

export async function ownedSponsorship(admin: Admin, ownerId: string) {
  const { data, error } = await admin.from("sponsorships").select("*")
    .eq("owner_id", ownerId).not("slot", "is", null).maybeSingle<Sponsorship>();
  if (error) throw error;
  return data;
}

export async function stripeRequest<T>(path: string, fields?: Record<string, string>, idempotencyKey?: string): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured");
  const headers = new Headers({ Authorization: `Bearer ${key}` });
  if (idempotencyKey) headers.set("Idempotency-Key", idempotencyKey);
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers,
    method: fields ? "POST" : "GET",
    body: fields ? new URLSearchParams(fields) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Stripe returned ${response.status}`);
  return response.json() as Promise<T>;
}

export type Checkout = {
  id: string;
  url: string | null;
  status: "open" | "complete" | "expired";
  payment_status: string;
  mode: string;
  client_reference_id: string | null;
  customer: string | null;
  subscription: string | null;
};

type Subscription = {
  id: string;
  status: string;
};

export async function syncSponsorCheckout(admin: Admin, checkout: Checkout) {
  const id = checkout.client_reference_id;
  if (!id || checkout.mode !== "subscription") return;
  let changes: { state: string; slot?: null; stripe_subscription_id?: string; stripe_customer_id?: string };
  if (checkout.status === "expired") {
    changes = { state: "ended", slot: null };
  } else {
    if (checkout.status !== "complete" || checkout.payment_status !== "paid" || !checkout.subscription || !checkout.customer) return;
    const subscription = await stripeRequest<Subscription>(`subscriptions/${encodeURIComponent(checkout.subscription)}`);
    changes = {
      ...subscriptionState(subscription.status),
      stripe_subscription_id: checkout.subscription,
      stripe_customer_id: checkout.customer,
    };
  }
  const { error } = await admin.from("sponsorships").update(changes)
    .eq("id", id).eq("checkout_session_id", checkout.id).eq("state", "checkout");
  if (error) throw error;
}

function subscriptionState(status: string) {
  if (status === "canceled" || status === "incomplete_expired") return { state: "ended", slot: null };
  return { state: status === "active" ? "active" : "paused" };
}

export async function syncSponsorSubscription(admin: Admin, id: string, eventAt: number) {
  const { data, error: lookupError } = await admin.from("sponsorships").select("id")
    .eq("stripe_subscription_id", id).maybeSingle();
  if (lookupError) throw lookupError;
  if (!data) return;

  // Read Stripe's latest status so a delayed event cannot reapply an old snapshot.
  const subscription = await stripeRequest<Subscription>(`subscriptions/${encodeURIComponent(id)}`);
  const { error } = await admin.from("sponsorships").update({
    ...subscriptionState(subscription.status),
    stripe_event_at: eventAt,
  }).eq("id", data.id).in("state", ["active", "paused"]).lte("stripe_event_at", eventAt);
  if (error) throw error;
}

export function validStripeSignature(payload: string, header: string | null, secret: string) {
  if (!header) return false;
  const parts = header.split(",").map(value => value.trim());
  const timestamp = parts.find(part => part.startsWith("t="))?.slice(2);
  if (!timestamp || !/^\d+$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest();
  return parts.some(part => /^v1=[a-f0-9]{64}$/i.test(part) &&
    timingSafeEqual(expected, Buffer.from(part.slice(3), "hex")));
}
