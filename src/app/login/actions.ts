"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { appOrigin, loginDestination, oauthDestinationCookie } from "@/lib/supabase/config";
import { createSupabase } from "@/lib/supabase/server";

type LoginState = { email?: string; error?: string };

export async function loginWithEmail(_: LoginState, form: FormData): Promise<LoginState> {
  const supabase = await createSupabase();
  if (!supabase) return { error: "Sign-in will be available once Supabase is configured." };

  const email = String(form.get("email") ?? "").trim();
  const code = String(form.get("code") ?? "").trim();
  if (form.get("intent") === "reset") return {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { error: "Enter a valid email address." };
  }
  if (form.get("intent") === "verify") {
    if (!/^\d{6}$/.test(code)) return { email, error: "Enter the six-digit code." };
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    if (error) return { email, error: "That code is invalid or expired. Try again or request a new code." };
    redirect(loginDestination(form.get("next")));
  }

  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) {
    return {
      email: form.get("intent") === "resend" ? email : undefined,
      error: "We couldn’t send a code. Wait a minute and try again.",
    };
  }
  return { email };
}

export async function loginWithGoogle(_: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const supabase = await createSupabase();
  if (!supabase) return { error: "Sign-in will be available once Supabase is configured." };

  const callback = new URL("/auth/callback", appOrigin());
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback.href },
  });
  if (error || !data.url) return { error: "Google sign-in is unavailable. Try email sign-in." };
  (await cookies()).set(oauthDestinationCookie, loginDestination(form.get("next")), {
    path: "/auth/callback",
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
