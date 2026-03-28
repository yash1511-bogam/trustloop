export default function DashboardLoading() {
  return (
    <div className="page-shell page-stack">
      <section className="page-header">
        <div className="page-header-main">
          <div className="h-3 w-24 rounded bg-[var(--color-rim)] animate-pulse" />
          <div className="h-7 w-56 rounded bg-[var(--color-rim)] animate-pulse" />
          <div className="h-4 w-72 rounded bg-[var(--color-surface)] animate-pulse" />
        </div>
        <div className="page-header-actions">
          <div className="h-9 w-36 rounded-[var(--radius-md)] bg-[var(--color-surface)] animate-pulse" />
          <div className="h-9 w-32 rounded-[var(--radius-md)] bg-[var(--color-signal-dim)] animate-pulse" />
        </div>
      </section>

      <section>
        <div className="h-5 w-24 rounded bg-[var(--color-rim)] animate-pulse" />
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="metric-card animate-pulse"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="h-2.5 w-20 rounded bg-[var(--color-rim)]" />
              <div className="h-8 w-12 rounded bg-[var(--color-rim)]" />
              <div className="h-2.5 w-16 rounded bg-[var(--color-surface)]" />
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="surface p-5 animate-pulse">
          <div className="h-5 w-48 rounded bg-[var(--color-rim)]" />
          <div className="mt-2 h-3 w-64 rounded bg-[var(--color-surface)]" />
        </div>
      </section>

      <section>
        <div className="table-shell animate-pulse">
          <div className="h-10 border-b border-[var(--color-rim)]" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 border-b border-[var(--color-rim)]" />
          ))}
        </div>
      </section>
    </div>
  );
}
