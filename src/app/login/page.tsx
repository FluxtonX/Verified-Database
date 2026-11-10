/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabase } from "@/lib/supabase/server";
import { loginDestination } from "@/lib/supabase/config";
import { signOut } from "./actions";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Log in | VerifedDB",
  description: "Log in to buy and sell startups. Get deal flow, list your startup, and talk with founders.",
};

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const supabase = await createSupabase();
  const session = await supabase?.auth.getClaims();
  const signedIn = Boolean(session?.data?.claims.sub);
  if (signedIn && error !== "logout") redirect(loginDestination(next));
  return (
    <main className="login-page">
      <div className="login-shell">
        <Link href="/" className="brand login-brand" aria-label="VerifedDB home">
          <img src="/assets/reference-0.webp" width="32" height="32" alt="" />
          <span>VerifedDB</span>
        </Link>
        <section className="login-card" aria-labelledby="login-heading">
          <h1 id="login-heading">{signedIn ? "You’re signed in" : "Log in to buy and sell startups"}</h1>
          <p className="login-description">Get deal flow, list your startup, and talk with founders.</p>
          {error === "callback" && <p role="alert">Sign-in didn’t finish. Please try again.</p>}
          {error === "logout" && <p role="alert">We couldn’t sign you out. Please try again.</p>}
          {signedIn ? (
            <form className="login-form" action={signOut}>
              <Link className="marketplace-account-link" href={loginDestination(next)}>Continue browsing</Link>
              <button className="login-submit">Sign out</button>
            </form>
          ) : <LoginForm next={loginDestination(next)} />}
        </section>
      </div>
    </main>
  );
}
