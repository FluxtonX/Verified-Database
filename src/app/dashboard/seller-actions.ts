"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createSupabase } from "@/lib/supabase/server";
import { appOrigin, oauthDestinationCookie } from "@/lib/supabase/config";
import { profilePictureBucket, sellerUrl } from "@/lib/seller-dashboard";
import { isLogoImage } from "@/lib/startup-logo";
import { startupHandle } from "@/lib/startup-details";

type State = { error?: string; message?: string };

async function account() {
  const supabase = await createSupabase();
  const session = await supabase?.auth.getClaims();
  const claims = session?.data?.claims;
  return supabase && claims?.sub ? { supabase, id: claims.sub, email: claims.email } : null;
}

const text = (form: FormData, field: string) => String(form.get(field) ?? "").trim();
const isId = (id: string) => /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id);

async function saveAccount(values: Record<string, string | boolean | null>): Promise<State> {
  const user = await account();
  if (!user) return { error: "Sign in to continue." };
  const { error } = await user.supabase.from("profiles").upsert({ id: user.id, ...values }, { defaultToNull: false });
  if (error) return { error: "Couldn’t save your changes. Try again." };
  revalidatePath("/dashboard");
  return { message: "Changes saved." };
}

export async function savePublicProfile(_: State, form: FormData): Promise<State> {
  const name = text(form, "name");
  const bio = text(form, "bio");
  if (!name || name.length > 100) return { error: "Enter a name up to 100 characters." };
  if (bio.length > 180) return { error: "Keep the description to 180 characters." };
  return saveAccount({ display_name: name, bio });
}

export async function saveSocialLink(platform: "x" | "linkedin", _: State, form: FormData): Promise<State> {
  if (platform === "x") {
    const handle = startupHandle(form.get("social"));
    if (handle && !/^[A-Za-z0-9_]{1,15}$/.test(handle)) return { error: "Enter a valid X username." };
    return saveAccount({ x_handle: handle || null });
  }
  if (platform !== "linkedin") return { error: "Choose a supported social profile." };
  const input = text(form, "social");
  if (!input) return saveAccount({ linkedin_url: null });
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || !["linkedin.com", "www.linkedin.com"].includes(url.host) ||
      url.username || url.password || !/^\/in\/[a-z\d%-]+\/?$/i.test(url.pathname) || url.pathname.length > 400) {
      return { error: "Enter a LinkedIn personal profile URL." };
    }
    return saveAccount({ linkedin_url: `https://www.linkedin.com${url.pathname}` });
  } catch {
    return { error: "Enter a LinkedIn personal profile URL." };
  }
}

export async function uploadProfilePicture(form: FormData): Promise<State> {
  const user = await account();
  if (!user) return { error: "Sign in to change your picture." };
  const file = form.get("picture");
  if (!(file instanceof File) || !await isLogoImage(file)) return { error: "Choose a supported image." };

  const bucket = user.supabase.storage.from(profilePictureBucket);
  const path = `${user.id}.png`;
  const { error } = await bucket.upload(path, file, { upsert: true, cacheControl: "0", contentType: "image/png" });
  if (error) return { error: "Couldn’t upload your picture. Try again." };
  const { data } = bucket.getPublicUrl(path);
  const url = new URL(data.publicUrl);
  url.searchParams.set("v", randomUUID());
  return saveAccount({ avatar_url: url.href });
}

export async function saveSellerPreferences(_: State, form: FormData): Promise<State> {
  const zone = text(form, "timezone");
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
  } catch {
    return { error: "Choose a valid timezone." };
  }
  if (!zone || zone.length > 64) return { error: "Choose a valid timezone." };
  return saveAccount({ timezone: zone, notify_messages: form.has("messages"), notify_saved: form.has("saved") });
}

export async function changeSellerEmail(_: State, form: FormData): Promise<State> {
  const user = await account();
  if (!user) return { error: "Sign in to change your email." };
  const email = text(form, "email");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || email.toLowerCase() === user.email?.toLowerCase()) {
    return { error: "Enter a different, valid email address." };
  }
  const callback = new URL("/auth/callback", appOrigin());
  const { error } = await user.supabase.auth.updateUser({ email }, { emailRedirectTo: callback.href });
  if (error) return { error: "Couldn’t request the email change. Try again later." };
  (await cookies()).set(oauthDestinationCookie, sellerUrl("settings"), {
    path: "/auth/callback", httpOnly: true, secure: callback.protocol === "https:", sameSite: "lax", maxAge: 3600,
  });
  return { message: "Check your inboxes for the confirmation links." };
}

export async function requestAccountDeletion(_: State, form: FormData): Promise<State> {
  if (form.get("intent") === "cancel") return saveAccount({ deletion_requested_at: null });
  if (text(form, "confirm") !== "DELETE") return { error: "Type DELETE to request account deletion." };
  return saveAccount({ deletion_requested_at: new Date().toISOString() });
}

export async function sendSellerFeedback(_: State, form: FormData): Promise<State> {
  const user = await account();
  if (!user) return { error: "Sign in to send feedback." };
  const body = text(form, "feedback");
  if (!body || body.length > 2000) return { error: "Enter feedback up to 2,000 characters." };
  const { error } = await user.supabase.rpc("submit_seller_feedback", { p_body: body });
  if (error) return { error: error.code === "P0001" ? "You’ve sent all 10 feedback messages." : "Couldn’t save feedback. Try again." };
  revalidatePath("/dashboard");
  return { message: "Feedback sent. Thank you." };
}

export async function sendSellerMessage(leadId: string, _: State, form: FormData): Promise<State> {
  const user = await account();
  if (!user || !isId(leadId)) return { error: "Conversation unavailable." };
  const body = text(form, "message");
  if (!body || body.length > 2000) return { error: "Enter a message up to 2,000 characters." };
  const { error } = await user.supabase.rpc("send_seller_message", { p_lead_id: leadId, p_body: body });
  if (error) return { error: "Couldn’t send your message. Try again." };
  revalidatePath("/dashboard");
  return { message: "Message sent." };
}

export async function setSellerLeadArchived(leadId: string, archived: boolean): Promise<State> {
  const user = await account();
  if (!user || !isId(leadId)) return { error: "Conversation unavailable." };
  const { data, error } = await user.supabase.from("seller_leads").update({ archived }).eq("id", leadId).select("id").maybeSingle();
  if (error || !data) return { error: "Couldn’t move this conversation. Try again." };
  revalidatePath("/dashboard");
  return { message: archived ? "Conversation archived." : "Conversation restored." };
}

export async function requestSaleListing(id: string): Promise<State> {
  const user = await account();
  if (!user || !isId(id)) return { error: "Startup unavailable." };
  const { data, error } = await user.supabase.from("startup_submissions").update({ wants_sale: true })
    .eq("id", id).eq("owner_id", user.id).select("id").maybeSingle();
  if (error || !data) return { error: "Couldn’t save your listing request." };
  revalidatePath("/dashboard");
  return { message: "Listing request saved." };
}
