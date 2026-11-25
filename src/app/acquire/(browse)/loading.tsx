// Shown while the marketplace loads. Scoped to the index (route group) so listing pages can still return real 404s.
export default function MarketplaceLoading() {
  return <div className="acquire-root" aria-busy="true" aria-live="polite">
    <span className="sr-only">Loading the marketplace…</span>
    <div className="skeleton-bar skeleton-nav" />
    <main className="acquire-main">
      <div className="skeleton-hero"><div className="skeleton-bar skeleton-title" /><div className="skeleton-bar skeleton-line" /><div className="skeleton-bar skeleton-line short" /></div>
      <div className="skeleton-grid">{Array.from({ length: 4 }, (_, index) => <div className="skeleton-card" key={index} />)}</div>
    </main>
  </div>;
}
