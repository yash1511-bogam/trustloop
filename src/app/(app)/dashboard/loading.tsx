export default function DashboardLoading() {
  return (
    <div className="page-shell page-stack">
      <section className="dash-hero">
        <div className="dash-hero-inner">
          <div className="dash-hero-text">
            <div className="h-3 w-20 rounded bg-[var(--color-rim)] animate-pulse" />
            <div className="h-6 w-44 rounded bg-[var(--color-rim)] animate-pulse" />
          </div>
          <div className="page-header-actions">
            <div className="h-9 w-28 rounded-[var(--radius-md)] bg-[var(--color-surface)] animate-pulse" />
            <div className="h-9 w-32 rounded-[var(--radius-md)] bg-[var(--color-signal-dim)] animate-pulse" />
          </div>
        </div>
      </section>
      <section className="dash-stats">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="dash-stat-card animate-pulse" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="h-8 w-8 rounded-[var(--radius-sm)] bg-[var(--color-rim)]" />
            <div className="h-6 w-12 rounded bg-[var(--color-rim)]" />
            <div className="h-3 w-20 rounded bg-[var(--color-rim)]" />
          </div>
        ))}
      </section>
      <div className="dash-analytics">
        <div className="dash-chart-card animate-pulse min-h-[260px]" />
        <div className="dash-chart-card animate-pulse min-h-[260px]" />
      </div>
      <div className="table-shell animate-pulse">
        <div className="h-9 border-b border-[var(--color-rim)]" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-11 border-b border-[var(--color-rim)]" />
        ))}
      </div>
    </div>
  );
}
