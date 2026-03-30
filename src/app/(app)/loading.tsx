export default function AppLoading() {
  return (
    <div className="page-shell page-stack">
      {/* Generic hero */}
      <section className="dash-hero">
        <div className="dash-hero-inner">
          <div className="dash-hero-text">
            <div className="h-3 w-16 rounded bg-[var(--color-rim)] animate-pulse" />
            <div className="h-7 w-40 rounded bg-[var(--color-rim)] animate-pulse" />
          </div>
        </div>
      </section>

      {/* Generic content placeholder */}
      <section>
        <div className="dash-section-header">
          <div className="h-4 w-32 rounded bg-[var(--color-rim)] animate-pulse" />
          <div className="h-3 w-56 rounded bg-[var(--color-surface)] animate-pulse" />
        </div>
        <div className="dash-chart-card animate-pulse">
          <div className="h-[200px] w-full rounded bg-[var(--color-void)]" />
        </div>
      </section>
    </div>
  );
}
