import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabase } from "@/lib/supabase/server";
import { loginDestination } from "@/lib/supabase/config";
import { signOut } from "./actions";
import LoginForm from "@/components/LoginForm";
import BrandMark from "@/components/BrandMark";
import { Icon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Log in | VerifedDB",
  description: "Log in to buy and sell startups. Get deal flow, list your startup, and talk with founders.",
  robots: { index: false, follow: true },
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
      <aside className="login-aside">
        <Link href="/" className="login-brand" aria-label="VerifedDB home"><BrandMark size={30} /><span>VerifedDB</span></Link>
        <div>
          <h2>Real revenue on the table. <em>Buyers ready to talk.</em></h2>
          <ul>
            <li><Icon name="check" size={16} />List with revenue from Stripe or RevenueCat</li>
            <li><Icon name="check" size={16} />Save startups and message founders directly</li>
            <li><Icon name="check" size={16} />Run diligence and the deal on your own terms</li>
          </ul>
        </div>
        <p>A meeting place, not a middleman.</p>
      </aside>
      <div className="login-shell">
        <Link href="/" className="login-brand login-brand-mobile" aria-label="VerifedDB home"><BrandMark size={28} /><span>VerifedDB</span></Link>
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
        <Link className="login-back" href="/">← Back to VerifedDB</Link>
      </div>
    </main>
  );
}
