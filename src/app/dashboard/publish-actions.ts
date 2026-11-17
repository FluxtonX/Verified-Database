"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createSupabase } from "@/lib/supabase/server";
import { importRevenueCatSource, importStripeSource } from "@/lib/provider-import";
import { isUuid, moneyCents, type ActionResult } from "@/lib/buyer-dashboard";
import { listingSnapshot, type Provider } from "@/lib/startup-metrics";
import { importedLogoUrl, startupLogoBucket, startupLogoPath } from "@/lib/startup-logo";

export async function publishListing(id: string, _: ActionResult, form: FormData): Promise<ActionResult> {
  const supabase = await createSupabase();
  // Use a server-validated user before crossing into the privileged publishing boundary.
  const auth = await supabase?.auth.getUser();
  const owner = auth?.data.user?.id;
  if (!supabase || !owner || !isUuid(id)) return { error: "Sign in to publish your startup." };
  const price = moneyCents(String(form.get("price") ?? "").trim());
  const sourceId = String(form.get("source") ?? "");
  if (price === null || !isUuid(sourceId)) return { error: "Enter a positive asking price in USD and select a provider." };
  const [source, draft] = await Promise.all([
    supabase.from("startup_payment_sources").select("id,provider,external_id").eq("id", sourceId).eq("startup_id", id).eq("owner_id", owner).maybeSingle<{ id: string; provider: Provider; external_id: string }>(),
    supabase.from("startup_submissions").select("website_url,description,imported_logo_url,anonymous").eq("id", id).eq("owner_id", owner).maybeSingle<{ website_url: string | null; description: string; imported_logo_url: string | null; anonymous: boolean }>(),
  ]);
  if (source.error || draft.error || !source.data || !draft.data) return { error: "Couldn’t load your startup and provider." };
  if (!draft.data.website_url || !draft.data.description.trim()) return { error: "Save a website and description in startup details first." };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) return { error: "Publishing is unavailable until server verification is configured." };
  const key = String(form.get("api-key") ?? "").trim();
  const verifiedAt = Date.now();
  const result = source.data.provider === "stripe" ? await importStripeSource(key) : await importRevenueCatSource(key, source.data.external_id);
  if (!result.source) return { error: result.error ?? "Couldn’t verify this provider." };
  if (result.source.id !== source.data.external_id) return { error: "This key belongs to a different provider account. Use the key for the selected source." };
  const snapshot = listingSnapshot(result.source.metrics, verifiedAt);
  if (!snapshot) return { error: "This provider needs complete, supported USD revenue metrics before it can be published." };
  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  let logo = draft.data.anonymous ? null : importedLogoUrl(draft.data.imported_logo_url);
  const picture = await supabase.storage.from(startupLogoBucket).download(startupLogoPath(owner, id));
  if (picture.data && !draft.data.anonymous) {
    const path = `${owner}/${id}.png`;
    const upload = await admin.storage.from("listing-logos").upload(path, picture.data, { upsert: true, contentType: "image/png", cacheControl: "0" });
    if (upload.error) return { error: "Couldn’t publish your logo. Try again." };
    logo = admin.storage.from("listing-logos").getPublicUrl(path).data.publicUrl;
  }
  const { error } = await admin.rpc("publish_startup_listing", { p_owner: owner, p_submission: id, p_source: sourceId, p_price: price,
    p_revenue: snapshot.revenueCents, p_mrr: snapshot.mrrCents, p_logo: logo });
  if (error) return { error: error.code === "P0004" ? "This startup has already been sold." : "Couldn’t publish this listing. Check that the marketplace migration is applied." };
  revalidatePath("/dashboard"); revalidatePath("/acquire", "layout"); revalidatePath("/");
  return { message: "Listing published. Buyers can now save it and contact you." };
}
export async function withdrawListing(id: string): Promise<ActionResult> {
  const supabase = await createSupabase();
  const session = await supabase?.auth.getClaims();
  if (!supabase || !session?.data?.claims.sub || !isUuid(id)) return { error: "Listing unavailable." };
  const { error } = await supabase.rpc("withdraw_startup_listing", { p_listing: id });
  if (error) return { error: "Couldn’t withdraw this listing. Refresh to check its status." };
  revalidatePath("/dashboard"); revalidatePath("/acquire", "layout"); revalidatePath("/");
  return { message: "Listing withdrawn." };
}
