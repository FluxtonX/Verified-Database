import {
  sponsorAdmin, stripeRequest, syncSponsorCheckout, syncSponsorSubscription, validStripeSignature,
  type Checkout,
} from "@/lib/sponsor-billing";

export const runtime = "nodejs";

const checkoutEvents = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.expired",
]);

const subscriptionEvents = new Set([
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
]);

export async function POST(request: Request) {
  const secret = process.env.STRIPE_SPONSOR_WEBHOOK_SECRET;
  const admin = sponsorAdmin();
  if (!secret || !admin) return new Response("Sponsorship webhook unavailable", { status: 503 });
  const payload = await request.text();
  if (!validStripeSignature(payload, request.headers.get("stripe-signature"), secret)) {
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    const event = JSON.parse(payload);
    const id = event.data?.object?.id;
    if (typeof id !== "string") return new Response("Invalid event", { status: 400 });
    if (checkoutEvents.has(event.type)) {
      const { data, error } = await admin.from("sponsorships").select("id")
        .eq("checkout_session_id", id).maybeSingle();
      if (error) throw error;
      if (data) await syncSponsorCheckout(admin, await stripeRequest<Checkout>(`checkout/sessions/${encodeURIComponent(id)}`));
    } else if (subscriptionEvents.has(event.type)) {
      await syncSponsorSubscription(admin, id, event.created);
    }
    return new Response(null, { status: 204 });
  } catch {
    return new Response("Could not reconcile sponsorship", { status: 500 });
  }
}
