export default function DashboardLoading() {
  return <div className="seller-dashboard marketplace-workspace" aria-busy="true" aria-live="polite">
    <span className="sr-only">Loading your workspace…</span>
    <aside className="dashboard-sidebar"><div className="skeleton-sidebar">{Array.from({ length: 6 }, (_, index) => <div className="skeleton-bar skeleton-line" key={index} />)}</div></aside>
    <main className="dashboard-main"><section className="workspace-page">
      <div className="skeleton-bar skeleton-title" /><div className="skeleton-bar skeleton-line" />
      <div className="skeleton-grid">{Array.from({ length: 3 }, (_, index) => <div className="skeleton-card" key={index} />)}</div>
    </section></main>
  </div>;
}
