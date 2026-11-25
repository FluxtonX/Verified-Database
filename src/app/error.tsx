"use client";

import Link from "next/link";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="status-page">
    <span className="eyebrow-pill"><span className="live-dot" />Something went wrong</span>
    <h1>We couldn’t load <em>this page.</em></h1>
    <p>It’s probably temporary. Try again, or head back to the marketplace.</p>
    <div className="status-actions">
      <button className="startup-submit" type="button" onClick={reset}>Try again</button>
      <Link className="seller-button" href="/acquire">Browse the marketplace</Link>
    </div>
  </main>;
}
