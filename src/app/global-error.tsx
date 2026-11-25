"use client";

// Last-resort page when the root layout itself fails, so it can't rely on site styles or fonts.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="en"><body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#f5f3ee", color: "#121212", fontFamily: "system-ui, sans-serif" }}>
    <main style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
      <h1 style={{ fontSize: 28, margin: "0 0 8px" }}>VerifedDB is having trouble</h1>
      <p style={{ color: "#57544d", margin: "0 0 20px" }}>Please try again in a moment.</p>
      <button type="button" onClick={reset} style={{ height: 44, padding: "0 18px", border: 0, borderRadius: 12, background: "#121212", color: "#fff", fontWeight: 600, cursor: "pointer" }}>Try again</button>
    </main>
  </body></html>;
}
