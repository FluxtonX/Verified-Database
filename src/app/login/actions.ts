"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { appOrigin, loginDestination, oauthDestinationCookie } from "@/lib/supabase/config";
import { createSupabase } from "@/lib/supabase/server";

export async function loginWithGoogle(_: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const supabase = await createSupabase();
  if (!supabase) return { error: "Sign-in will be available once Supabase is configured." };

  const callback = new URL("/auth/callback", appOrigin());
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback.href },
  });
  if (error || !data.url) return { error: "Google sign-in is unavailable. Please try again." };
  (await cookies()).set(oauthDestinationCookie, loginDestination(form.get("next")), {
    path: callback.pathname,
    httpOnly: true,
    secure: callback.protocol === "https:",
    sameSite: "lax",
    maxAge: 600,
  });
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createSupabase();
  const result = await supabase?.auth.signOut({ scope: "local" });
  redirect(result?.error ? "/login?error=logout" : "/login");
}
