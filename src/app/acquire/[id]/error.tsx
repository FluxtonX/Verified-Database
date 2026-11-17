"use client";
import Link from "next/link";
export default function ListingError({ reset }: { reset: () => void }) {
  return <main className="listing-page"><div className="seller-card workspace-empty"><h1>Couldn’t load this opportunity</h1><p className="muted">The marketplace is temporarily unavailable. Please try again.</p><button className="startup-submit" onClick={reset}>Try again</button><Link className="text-link" href="/acquire">Back to marketplace</Link></div></main>;
}
