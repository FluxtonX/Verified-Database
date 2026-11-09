"use server";

import { revalidatePath } from "next/cache";
import { createSupabase } from "@/lib/supabase/server";

type DraftState = { error?: string; saved?: boolean };

export async function saveStartup(_: DraftState, form: FormData): Promise<DraftState> {
  const supabase = await createSupabase();
  const session = await supabase?.auth.getClaims();
  if (!supabase || !session?.data?.claims.sub) return { error: "Sign in to save a startup draft." };

  const name = String(form.get("name") ?? "").trim();
  const websiteInput = String(form.get("website") ?? "").trim();
  const category = String(form.get("category") ?? "");
  const handle = String(form.get("x-handle") ?? "").trim().replace(/^@/, "");
  if (!name || name.length > 100 || !category) return { error: "Enter a startup name and category." };
  if (handle && !/^[A-Za-z0-9_]{1,15}$/.test(handle)) return { error: "Enter a valid X handle." };

  let website: URL;
  try {
    website = new URL(websiteInput);
  } catch {
    return { error: "Enter a complete website URL, including https://." };
  }
  if (!["https:", "http:"].includes(website.protocol) || website.username || website.password || website.href.length > 2048) {
    return { error: "Enter a valid HTTP or HTTPS website URL." };
  }
  website.hash = "";
  website.search = "";

  const addons = [...new Set(form.getAll("addon").map(String))];
  const { error } = await supabase.from("startup_submissions").insert({
    name, website_url: website.href, category, x_handle: handle || null,
    provider: "stripe", anonymous: form.has("anonymous"), wants_sale: form.has("wants-sale"),
    addon_interests: addons,
  });
  if (error?.code === "23505") return { error: "You already have a draft for this website." };
  if (error) return { error: "We couldn’t save your draft. Check your details and try again." };
  return { saved: true };
}

export async function setActivityLike(postId: string, liked: boolean) {
  const supabase = await createSupabase();
  const session = await supabase?.auth.getClaims();
  if (!supabase || !session?.data?.claims.sub || !/^[a-f\d-]{36}$/i.test(postId)) return false;

  const { error } = liked
    ? await supabase.from("activity_likes").insert({ post_id: postId })
    : await supabase.from("activity_likes").delete().eq("post_id", postId);
  if (error && error.code !== "23505") return false;
  revalidatePath("/");
  return true;
}
