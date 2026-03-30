export default function SettingsLoading() {
  return (
    <div className="page-stack">
      {/* Hero */}
      <section className="dash-hero">
        <div className="dash-hero-inner">
          <div className="dash-hero-text">
            <div className="h-3 w-16 rounded bg-[var(--color-rim)] animate-pulse" />
            <div className="h-7 w-28 rounded bg-[var(--color-rim)] animate-pulse" />
          </div>
        </div>
      </section>

      {/* Section header */}
      <section>
        <div className="dash-section-header">
          <div className="h-4 w-36 rounded bg-[var(--color-rim)] animate-pulse" />
          <div className="h-3 w-64 rounded bg-[var(--color-surface)] animate-pulse" />
        </div>

        {/* 6 stat cards in 3-col grid */}
        <div className="dash-stats" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="dash-stat-card animate-pulse" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="h-7 w-12 rounded bg-[var(--color-rim)]" />
              <div className="h-3 w-20 rounded bg-[var(--color-rim)] mt-2" />
              <div className="h-3 w-32 rounded bg-[var(--color-surface)] mt-1" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
