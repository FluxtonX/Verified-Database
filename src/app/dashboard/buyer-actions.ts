"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabase } from "@/lib/supabase/server";
import { buyerUrl, isUuid, listingReturn, moneyCents, type ActionResult, type InquiryStatus } from "@/lib/buyer-dashboard";

async function account() {
  const supabase = await createSupabase();
  const session = await supabase?.auth.getClaims();
  return supabase && session?.data?.claims.sub ? { supabase, id: session.data.claims.sub } : null;
}
function refresh() { revalidatePath("/dashboard"); revalidatePath("/acquire", "layout"); }
function activityError(code?: string) {
  if (code === "P0003") return "Set up your buyer profile before saving or contacting sellers.";
  if (code === "P0002") return "This listing is unavailable, or belongs to your seller profile.";
  if (code === "P0004") return "You already have an inquiry for this startup. Continue in your inbox.";
  return "Couldn’t save this change. Please try again.";
}
export async function setSavedListing(id: string, saved: boolean): Promise<ActionResult> {
  const user = await account();
  if (!user || !isUuid(id)) return { error: "Sign in to save a startup." };
  const { error } = await user.supabase.rpc("set_saved_listing", { p_listing_id: id, p_saved: saved });
  if (error) return { error: activityError(error.code) };
  refresh();
  return { message: saved ? "Startup saved." : "Startup removed." };
}
export async function saveBuyerProfile(_: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await account();
  if (!user) return { error: "Sign in to save your buyer profile." };
  const name = String(form.get("name") ?? "").trim();
  const bio = String(form.get("bio") ?? "").trim();
  const budget = (field: string) => {
    const raw = String(form.get(field) ?? "").trim();
    return raw === "" ? null : /^\d{1,12}$/.test(raw) && Number(raw) <= 100000000000 ? Number(raw) : NaN;
  };
  const min = budget("budget-min"), max = budget("budget-max");
  if (!name || name.length > 100 || bio.length > 180) return { error: "Enter your name and a description up to 180 characters." };
  if (Number.isNaN(min) || Number.isNaN(max) || (min !== null && max !== null && min > max)) return { error: "Enter a valid minimum and maximum budget in whole USD." };
  const categories = [...new Set(form.getAll("category").map(String))];
  if (categories.length > 20) return { error: "Select up to 20 categories." };
  if (categories.length) {
    const valid = await user.supabase.from("categories").select("name").in("name", categories);
    if (valid.error || valid.data.length !== categories.length) return { error: "Choose valid startup categories." };
  }
  const { error } = await user.supabase.from("buyer_profiles").upsert({ id: user.id, display_name: name, bio, budget_min: min, budget_max: max, categories }, { defaultToNull: false });
  if (error) return { error: "Couldn’t save your buyer profile. Try again." };
  refresh();
  const destination = listingReturn(form.get("returnTo"));
  if (destination) redirect(destination + "#contact");
  return { message: "Buyer profile saved." };
}
export async function saveBuyerPreferences(_: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await account();
  if (!user) return { error: "Sign in to save preferences." };
  const { data, error } = await user.supabase.from("buyer_profiles").update({
    notify_messages: form.has("messages"), notify_price_drops: form.has("price-drops"),
  }).eq("id", user.id).select("id").maybeSingle();
  if (error || !data) return { error: "Create your buyer profile first, then save preferences." };
  refresh();
  return { message: "Preferences saved. Email delivery is pending setup." };
}
export async function contactListing(id: string, inquiry: boolean, _: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await account();
  if (!user || !isUuid(id)) return { error: "Sign in to contact this seller." };
  const body = String(form.get("message") ?? "").trim();
  const offer = String(form.get("offer") ?? "").trim();
  if (!body || body.length > 2000) return { error: "Enter a message up to 2,000 characters." };
  const offerCents = offer ? moneyCents(offer) : null;
  if (offer && offerCents === null) return { error: "Enter a positive offer in USD, with up to two decimal places." };
  const { data, error } = await user.supabase.rpc("contact_listing", { p_listing_id: id, p_body: body, p_inquiry: inquiry, p_offer_cents: offerCents });
  if (error || typeof data !== "string") return { error: activityError(error?.code) };
  refresh();
  redirect(buyerUrl("chat", { thread: data }));
}
export async function sendBuyerMessage(id: string, _: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await account();
  if (!user || !isUuid(id)) return { error: "Conversation unavailable." };
  const body = String(form.get("message") ?? "").trim();
  if (!body || body.length > 2000) return { error: "Enter a message up to 2,000 characters." };
  const { error } = await user.supabase.rpc("send_buyer_message", { p_lead_id: id, p_body: body });
  if (error) return { error: "Couldn’t send your message. Try again." };
  refresh();
  return { message: "Message sent." };
}
export async function updateAcquisition(id: string, status: InquiryStatus): Promise<ActionResult> {
  const user = await account();
  if (!user || !isUuid(id) || !["accepted", "declined", "withdrawn", "completed"].includes(status)) return { error: "Inquiry unavailable." };
  const { error } = await user.supabase.rpc("update_acquisition", { p_lead_id: id, p_status: status });
  if (error) return { error: "Couldn’t update this inquiry. Refresh to check its current status." };
  refresh();
  revalidatePath("/");
  return { message: "Inquiry updated." };
}
export async function sendBuyerFeedback(_: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await account();
  if (!user) return { error: "Sign in to send feedback." };
  const body = String(form.get("feedback") ?? "").trim();
  if (!body || body.length > 2000) return { error: "Enter feedback up to 2,000 characters." };
  const { error } = await user.supabase.rpc("submit_buyer_feedback", { p_body: body });
  if (error) return { error: error.code === "P0001" ? "You’ve sent all 10 messages." : "Couldn’t send feedback. Try again." };
  refresh();
  return { message: "Feedback sent. Thank you." };
}
