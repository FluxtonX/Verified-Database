/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Log in | VerifedDB",
  description: "Log in to buy and sell startups. Get deal flow, list your startup, and talk with founders.",
};

export default function LoginPage() {
  return (
    <main className="login-page">
      <div className="login-shell">
        <Link href="/" className="brand login-brand" aria-label="VerifedDB home">
          <img src="/assets/reference-0.webp" width="32" height="32" alt="" />
          <span>VerifedDB</span>
        </Link>
        <section className="login-card" aria-labelledby="login-heading">
          <h1 id="login-heading">Log in to buy and sell startups</h1>
          <p className="login-description">Get deal flow, list your startup, and talk with founders.</p>
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
