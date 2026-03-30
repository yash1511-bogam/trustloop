export default function DashboardLoading() {
  return (
    <div className="page-shell page-stack">
      {/* Hero */}
      <section className="dash-hero">
        <div className="dash-hero-inner">
          <div className="dash-hero-text">
            <div className="h-3 w-20 rounded bg-[var(--color-rim)] animate-pulse" />
            <div className="h-7 w-44 rounded bg-[var(--color-rim)] animate-pulse" />
          </div>
          <div className="page-header-actions">
            <div className="h-9 w-24 rounded-[var(--radius-md)] bg-[var(--color-surface)] animate-pulse" />
            <div className="h-9 w-32 rounded-[var(--radius-md)] bg-[var(--color-signal-dim)] animate-pulse" />
          </div>
        </div>
      </section>

      {/* 3 stat cards with icon, value, label, sub, trend */}
      <section className="dash-stats">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="dash-stat-card animate-pulse" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="dash-stat-top">
              <div className="h-9 w-9 rounded-[var(--radius-sm)] bg-[var(--color-rim)]" />
              <div className="h-4 w-24 rounded bg-[var(--color-rim)]" />
            </div>
            <div className="h-8 w-14 rounded bg-[var(--color-rim)] mt-2" />
            <div className="h-3 w-24 rounded bg-[var(--color-rim)] mt-2" />
            <div className="h-3 w-20 rounded bg-[var(--color-surface)] mt-1" />
          </div>
        ))}
      </section>

      {/* Analytics row: wide chart + donut */}
      <section className="dash-analytics">
        <div className="dash-chart-card dash-chart-card-wide animate-pulse">
          <div className="dash-chart-header">
            <div className="space-y-2">
              <div className="h-4 w-32 rounded bg-[var(--color-rim)]" />
              <div className="h-3 w-48 rounded bg-[var(--color-surface)]" />
            </div>
          </div>
          <div className="h-[280px] w-full rounded bg-[var(--color-void)]" />
        </div>
        <div className="dash-chart-card animate-pulse">
          <div className="dash-chart-header">
            <div className="space-y-2">
              <div className="h-4 w-20 rounded bg-[var(--color-rim)]" />
              <div className="h-3 w-36 rounded bg-[var(--color-surface)]" />
            </div>
          </div>
          <div className="flex items-center justify-center py-8">
            <div className="h-[140px] w-[140px] rounded-full bg-[var(--color-void)]" />
          </div>
        </div>
      </section>
    </div>
  );
}
