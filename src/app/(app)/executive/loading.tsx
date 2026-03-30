export default function ExecutiveLoading() {
  return (
    <div className="page-shell page-stack">
      {/* Hero */}
      <section className="dash-hero">
        <div className="dash-hero-inner">
          <div className="dash-hero-text">
            <div className="h-3 w-16 rounded bg-[var(--color-rim)] animate-pulse" />
            <div className="h-7 w-48 rounded bg-[var(--color-rim)] animate-pulse" />
          </div>
          <div className="page-header-actions">
            <div className="h-8 w-24 rounded-[var(--radius-md)] bg-[var(--color-surface)] animate-pulse" />
            <div className="h-8 w-28 rounded-[var(--radius-md)] bg-[var(--color-surface)] animate-pulse" />
          </div>
        </div>
      </section>

      {/* Operating state: section header + 5 stat cards */}
      <section>
        <div className="dash-section-header">
          <div className="h-4 w-44 rounded bg-[var(--color-rim)] animate-pulse" />
          <div className="h-3 w-72 rounded bg-[var(--color-surface)] animate-pulse" />
        </div>
        <div className="dash-stats" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="dash-stat-card animate-pulse" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="h-7 w-10 rounded bg-[var(--color-rim)]" />
              <div className="h-3 w-20 rounded bg-[var(--color-rim)] mt-2" />
              <div className="h-3 w-full rounded bg-[var(--color-surface)] mt-1" />
            </div>
          ))}
        </div>
      </section>

      {/* Coverage: section header + 3 stat cards */}
      <section>
        <div className="dash-section-header">
          <div className="h-4 w-40 rounded bg-[var(--color-rim)] animate-pulse" />
          <div className="h-3 w-80 rounded bg-[var(--color-surface)] animate-pulse" />
        </div>
        <div className="dash-stats" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="dash-stat-card animate-pulse" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="h-7 w-14 rounded bg-[var(--color-rim)]" />
              <div className="h-3 w-24 rounded bg-[var(--color-rim)] mt-2" />
              <div className="h-3 w-full rounded bg-[var(--color-surface)] mt-1" />
            </div>
          ))}
        </div>
      </section>

      {/* 14-day chart: section header + chart card */}
      <section>
        <div className="dash-section-header">
          <div className="h-4 w-44 rounded bg-[var(--color-rim)] animate-pulse" />
          <div className="h-3 w-80 rounded bg-[var(--color-surface)] animate-pulse" />
        </div>
        <div className="dash-chart-card animate-pulse">
          <div className="h-[260px] w-full rounded bg-[var(--color-void)]" />
        </div>
      </section>
    </div>
  );
}
