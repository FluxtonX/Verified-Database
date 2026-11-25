"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabase } from "@/lib/supabase/server";
import { importAllowed } from "@/lib/rate-limit";
import { importRevenueCatSource, importStripeSource } from "@/lib/provider-import";
import { startupHandle, startupTeamSizes, startupWebsite, storeLink } from "@/lib/startup-details";
import { isLogoImage, startupLogoBucket, startupLogoPath } from "@/lib/startup-logo";
import { logError } from "@/lib/log";

type ActionState = { error?: string; saved?: boolean };
const importLimited = "You’ve connected providers several times in the last hour. Try again later.";


export async function uploadStartupLogo(id: string, form: FormData): Promise<ActionState> {
  const supabase = await createSupabase();
  const session = await supabase?.auth.getClaims();
  const owner = session?.data?.claims.sub;
  if (!supabase || !owner) return { error: "Sign in to change your startup logo." };
  if (!/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id)) return { error: "Startup not found." };

  const logo = form.get("logo");
  if (!await isLogoImage(logo)) return { error: "Choose a supported image for your logo." };

  const { error } = await supabase.storage.from(startupLogoBucket).upload(startupLogoPath(owner, id), logo as File, {
    upsert: true,
    cacheControl: "0",
    contentType: "image/png",
  });
  if (error) { logError("startup.logo_upload", error, { submission: id }); return { error: "Couldn’t save the logo. Try again." }; }
  revalidatePath("/dashboard");
  revalidatePath(`/startup/${id}`);
  return { saved: true };
}

export async function importStartupSource(target: string | null, _: ActionState, form: FormData): Promise<ActionState> {
  const supabase = await createSupabase();
  const session = await supabase?.auth.getClaims();
  const owner = session?.data?.claims.sub;
  if (!supabase || !owner) return { error: "Sign in before connecting a provider." };

  if (target) {
    if (!/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(target)) return { error: "Startup not found." };
    const { data } = await supabase.from("startup_submissions").select("id").eq("id", target).eq("owner_id", owner).maybeSingle();
    if (!data) return { error: "Startup not found." };
  }

  const provider = form.get("provider");
  if (provider !== "stripe" && provider !== "revenuecat") return { error: "Choose a payment provider." };
  const handle = startupHandle(form.get("x-handle"));
  if (handle && !/^[A-Za-z0-9_]{1,15}$/.test(handle)) return { error: "Enter a valid X handle." };

  const input = form.get("api-key");
  const key = typeof input === "string" ? input.trim() : "";
  const project = String(form.get("project-id") ?? "").trim();
  if (!await importAllowed(supabase)) return { error: importLimited };
  const started = new Date().toISOString();
  const result = await (provider === "stripe" ? importStripeSource(key) : importRevenueCatSource(key, project));
  if (!result.source) return { error: result.error };

  const source = result.source;
  const snapshot = {
    p_startup_id: target, p_external_id: source.id, p_name: source.name,
    p_website: source.website, p_description: source.description,
    p_handle: handle || null, p_metrics: source.metrics, p_synced_at: started,
  };
  const { data, error } = source.appProfile
    ? await supabase.rpc("save_revenuecat_app_profile", {
      ...snapshot,
      p_app_store_url: source.appProfile.app_store_url,
      p_google_play_url: source.appProfile.google_play_url,
      p_logo_url: source.appProfile.logo_url,
      p_mobile_app: source.appProfile.mobile_app,
    })
    : await supabase.rpc("save_startup_payment_source", {
      ...snapshot, p_provider: provider, p_country: source.country,
    });

  if (error) logError("startup.import_save", error, { provider, target });
  if (error?.code === "P0003") return { error: "This account is already connected to another startup in your dashboard." };
  if (error?.code === "23505") return { error: "This website already has a startup. Open it in My startups and choose Connect provider." };
  if (error || typeof data !== "string") return { error: "The provider responded, but its metrics couldn’t be saved. Try again." };

  revalidatePath("/dashboard");
  revalidatePath(`/startup/${data}`);
  if (target) return { saved: true };
  redirect(`/dashboard?startup=${data}`);
}

export async function updateStartupDetails(id: string, _: ActionState, form: FormData): Promise<ActionState> {
  const supabase = await createSupabase();
  const session = await supabase?.auth.getClaims();
  const owner = session?.data?.claims.sub;
  if (!supabase || !owner) return { error: "Sign in to edit your startup." };
  if (!/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id)) return { error: "Startup not found." };

  const value = (field: string) => String(form.get(field) ?? "").trim();
  const tags = (field: string) => [...new Set(value(field).split(",").map(tag => tag.trim()).filter(Boolean))];
  const name = value("name");
  const category = value("category");
  const websiteInput = value("website");
  const website = startupWebsite(websiteInput);
  const handle = startupHandle(form.get("x-handle"));
  const country = value("country").toUpperCase();
  const founded = value("founded-on");
  const marginInput = value("profit-margin");
  const margin = marginInput ? Number(marginInput) : null;
  const funding = value("funding");
  const teamSize = value("team-size");
  const markets = tags("markets");
  const techStack = tags("tech-stack");
  const channels = tags("marketing-channels");
  const description = value("description");
  const proposition = value("value-proposition");
  const problem = value("problem-solved");
  const audience = value("audience-description");
  const pricing = value("pricing");
  const additional = value("additional-info");
  const appStoreInput = value("app-store");
  const googlePlayInput = value("google-play");
  const anonymous = form.has("anonymous");
  // Only send the privacy flag when it changes, so other edits keep working on databases
  // that haven't applied the migration granting this column yet.
  const anonymityChanged = anonymous !== (form.get("anonymous-was") === "1");
  const appStore = storeLink(appStoreInput, "apps.apple.com");
  const googlePlay = storeLink(googlePlayInput, "play.google.com");

  if (!category || category.length > 100) return { error: "Choose a startup category." };
  if (!name || name.length > 100) return { error: "Enter a startup name of up to 100 characters." };
  if (websiteInput && !website) return { error: "Enter a website URL that starts with https:// or http://." };
  if (handle && !/^[A-Za-z0-9_]{1,15}$/.test(handle)) return { error: "Enter a valid X handle." };
  if (country && !/^[A-Z]{2}$/.test(country)) return { error: "Enter a two-letter country code." };
  if (founded && !/^\d{4}-\d{2}-\d{2}$/.test(founded)) return { error: "Enter a valid founding date." };
  if (margin !== null && (!Number.isFinite(margin) || margin > 100 || margin < -99999.99)) return { error: "Enter a valid profit margin of 100% or less." };
  if ((funding && funding !== "bootstrapped" && funding !== "vc-backed") ||
      (teamSize && !startupTeamSizes.some(size => size === teamSize))) return { error: "Choose a valid funding type and team size." };
  if (markets.length > 5 || techStack.length > 20 || channels.length > 15 ||
      [...markets, ...techStack, ...channels].some(tag => tag.length > 100)) return { error: "Check the number and length of your tags." };
  if ((appStoreInput && !appStore) || (googlePlayInput && !googlePlay)) return { error: "Enter valid Apple App Store and Google Play links." };
  if ([description, proposition, problem, audience, pricing, additional].some(text => text.length > 500)) return { error: "Keep descriptions to 500 characters each." };

  const { data, error } = await supabase.from("startup_submissions").update({
    name,
    category,
    website_url: website,
    description,
    x_handle: handle || null,
    country: country || null,
    founded_on: founded || null,
    profit_margin_pct: margin,
    funding: funding || null,
    team_size: teamSize || null,
    mobile_app: form.has("mobile-app"),
    markets,
    tech_stack: techStack,
    marketing_channels: channels,
    value_proposition: proposition,
    problem_solved: problem,
    audience_description: audience,
    pricing,
    additional_info: additional,
    ...(form.has("mobile-app") && { app_store_url: appStore, google_play_url: googlePlay }),
    ...(anonymityChanged && { anonymous }),
  }).eq("id", id).eq("owner_id", owner).select("id").maybeSingle();

  if (error) logError("startup.update", error, { submission: id, anonymityChanged });
  if (error?.code === "23505") return { error: "You already have a draft for this website." };
  if (error?.code === "23503") return { error: "Choose a valid startup category." };
  if (error?.code === "42501" && anonymityChanged) return { error: "Anonymous listings aren’t enabled on this database yet. Apply the latest migration, then try again." };
  if (error || !data) return { error: "Couldn’t save your changes. Check your details and try again." };
  revalidatePath("/dashboard");
  revalidatePath(`/startup/${id}`);
  return { saved: true };
}

const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;

export async function deleteStartup(id: string): Promise<ActionState> {
  const supabase = await createSupabase();
  const owner = (await supabase?.auth.getClaims())?.data?.claims.sub;
  if (!supabase || !owner) return { error: "Sign in to delete your startup." };
  if (!uuid.test(id)) return { error: "Startup not found." };
  const { error } = await supabase.rpc("delete_startup_draft", { p_submission: id });
  if (error) {
    logError("startup.delete", error, { submission: id });
    return { error: error.code === "P0006" ? "Withdraw the marketplace listing before deleting this startup." : "Couldn’t delete this startup. Try again." };
  }
  // Only after the draft is gone (a refused delete keeps its logo). The storage policy allows
  // removing files in your own folder, so this works without the draft row.
  const logo = await supabase.storage.from(startupLogoBucket).remove([startupLogoPath(owner, id)]);
  if (logo.error) logError("startup.delete_logo", logo.error, { submission: id });
  revalidatePath("/dashboard");
  revalidatePath("/");
  redirect("/dashboard?tab=my-startups&mode=seller");
}

export async function disconnectSource(sourceId: string, startupId: string): Promise<ActionState> {
  const supabase = await createSupabase();
  const owner = (await supabase?.auth.getClaims())?.data?.claims.sub;
  if (!supabase || !owner) return { error: "Sign in to change providers." };
  if (!uuid.test(sourceId) || !uuid.test(startupId)) return { error: "Provider not found." };
  const { error } = await supabase.rpc("disconnect_payment_source", { p_source: sourceId });
  if (error) {
    logError("startup.disconnect_source", error, { source: sourceId });
    return { error: error.code === "P0007" ? "Add a website in startup details before disconnecting this provider." : "Couldn’t disconnect this provider. Try again." };
  }
  revalidatePath("/dashboard");
  revalidatePath(`/startup/${startupId}`);
  return { saved: true };
}
