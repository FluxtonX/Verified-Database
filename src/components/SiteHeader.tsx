"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";

const themeListeners = new Set<() => void>();

function subscribeTheme(cb: () => void) {
  themeListeners.add(cb);
  return () => {
    themeListeners.delete(cb);
  };
}

const readTheme = (): "light" | "dark" =>
  document.documentElement.dataset.theme === "dark" ? "dark" : "light";

export default function SiteHeader() {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "light" as const);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
    themeListeners.forEach((l) => l());
  };

  return (
    <header className="nav">
      <div className="wrap nav-in">
        <Link className="logo" href="/">
          <span className="logo-mark">T</span>
          TrustLedger
        </Link>
        <nav className="nav-links" aria-label="Main">
          <Link href="/#startups">Startups</Link>
          <Link href="/marketplace">Buy &amp; Sell</Link>
          <Link href="/list">+ List Startup</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/admin" style={{ opacity: 0.7, fontSize: "0.85rem" }}>Admin</Link>
        </nav>
        <div className="nav-right">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <Link className="btn btn-dark" href="/list">
            + List Startup
          </Link>
        </div>
      </div>
    </header>
  );
}
