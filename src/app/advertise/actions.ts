"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { appOrigin } from "@/lib/supabase/config";
import type { Sponsorship } from "@/lib/sponsorship";
import {
  ownedSponsorship, readSponsorPrice, sponsorAccount, sponsorAdmin, sponsorCheckoutEnabled, stripeRequest,
  syncSponsorCheckout, type Checkout,
} from "@/lib/sponsor-billing";

export async function startSponsorCheckout(form: FormData) {
  const user = await sponsorAccount();
  if (!user) redirect("/login?next=%2Fadvertise");
  const admin = sponsorAdmin();
  if (!admin || !sponsorCheckoutEnabled()) redirect("/advertise?error=unavailable");

  const price = await readSponsorPrice();
  if (!price) redirect("/advertise?error=unavailable");
  const shownPrice = form.get("priceId");
  if (shownPrice !== null && shownPrice !== price.id) redirect("/advertise?error=price-changed");

  let destination: string;
  try {
    const current = await ownedSponsorship(admin, user.id);
    if (current?.checkout_session_id && current.state === "checkout") {
      const checkout = await stripeRequest<Checkout>(`checkout/sessions/${encodeURIComponent(current.checkout_session_id)}`);
      await syncSponsorCheckout(admin, checkout);
    }

    const { data, error } = await admin.rpc("reserve_sponsorship", { p_owner: user.id });
    const reservation = data as Sponsorship | null;
    if (error) throw error;
    if (!reservation?.id) destination = "/advertise?error=sold-out";
    else if (reservation.state !== "checkout") destination = "/advertise";
    else if (reservation.checkout_session_id) {
      const checkout = await stripeRequest<Checkout>(`checkout/sessions/${encodeURIComponent(reservation.checkout_session_id)}`);
      destination = checkout.status === "open" && checkout.url ? checkout.url : "/advertise?checkout=success";
    } else {
      const origin = appOrigin();
      const checkout = await stripeRequest<Checkout>("checkout/sessions", {
        mode: "subscription",
        "payment_method_types[0]": "card",
        "line_items[0][price]": price.id,
        "line_items[0][quantity]": "1",
        client_reference_id: reservation.id,
        expires_at: String(Date.parse(reservation.checkout_expires_at) / 1000),
        success_url: `${origin}/advertise?checkout=success`,
        cancel_url: `${origin}/advertise?checkout=cancelled`,
        ...(user.email ? { customer_email: user.email } : {}),
      }, `sponsor-${reservation.id}`);
      if (!checkout.url || checkout.status !== "open") throw new Error("Checkout is not open");
      const { data: saved, error: saveError } = await admin.from("sponsorships")
        .update({ checkout_session_id: checkout.id }).eq("id", reservation.id).eq("state", "checkout")
        .select("id").maybeSingle();
      if (saveError || !saved) throw new Error("Could not save checkout");
      destination = checkout.url;
    }
  } catch {
    destination = "/advertise?error=checkout";
  }
  redirect(destination);
}

function sponsorUrl(value: FormDataEntryValue | null, httpsOnly = false) {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value.trim());
    if (url.username || url.password || !(url.protocol === "https:" || (!httpsOnly && url.protocol === "http:"))) return null;
    return url.href.length <= 2048 ? url.href : null;
  } catch {
    return null;
  }
}

export async function publishSponsor(form: FormData) {
  const user = await sponsorAccount();
  if (!user) redirect("/login?next=%2Fadvertise");
  const name = String(form.get("name") ?? "").trim();
  const headline = String(form.get("headline") ?? "").trim();
  const websiteUrl = sponsorUrl(form.get("website"));
  const logo = String(form.get("logo") ?? "").trim();
  const logoUrl = logo ? sponsorUrl(logo, true) : null;
  if (!name || name.length > 60 || !headline || headline.length > 150 || !websiteUrl || (logo && !logoUrl)) {
    redirect("/advertise?error=details");
  }

  const admin = sponsorAdmin();
  if (!admin) redirect("/advertise?error=unavailable");
  const { data, error } = await admin.from("sponsorships").update({
    name, headline, website_url: websiteUrl, logo_url: logoUrl,
  }).eq("owner_id", user.id).eq("state", "active").select("id").maybeSingle();
  if (error || !data) redirect("/advertise?error=publish");
  revalidatePath("/");
  revalidatePath("/acquire");
  redirect(`/?publishedSponsor=${encodeURIComponent(data.id)}`);
}

export async function openSponsorBilling() {
  const user = await sponsorAccount();
  if (!user) redirect("/login?next=%2Fadvertise");
  const admin = sponsorAdmin();
  if (!admin) redirect("/advertise?error=unavailable");
  let destination: string;
  try {
    const sponsorship = await ownedSponsorship(admin, user.id);
    if (!sponsorship?.stripe_customer_id) throw new Error("No billing account");
    const session = await stripeRequest<{ url: string }>("billing_portal/sessions", {
      customer: sponsorship.stripe_customer_id,
      return_url: `${appOrigin()}/advertise`,
    });
    destination = session.url;
  } catch {
    destination = "/advertise?error=billing";
  }
  redirect(destination);
}
