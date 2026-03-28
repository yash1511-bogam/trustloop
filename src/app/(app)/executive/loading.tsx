export default function ExecutiveLoading() {
  return (
    <div className="page-shell page-stack">
      <section className="page-header">
        <div className="page-header-main">
          <div className="h-3 w-20 rounded bg-[var(--color-rim)] animate-pulse" />
          <div className="h-7 w-64 rounded bg-[var(--color-rim)] animate-pulse" />
          <div className="h-4 w-80 rounded bg-[var(--color-surface)] animate-pulse" />
        </div>
      </section>
      <section>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="metric-card animate-pulse" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="h-2.5 w-20 rounded bg-[var(--color-rim)]" />
              <div className="h-8 w-12 rounded bg-[var(--color-rim)]" />
              <div className="h-2.5 w-28 rounded bg-[var(--color-surface)]" />
            </div>
          ))}
        </div>
      </section>
      <section className="surface p-6 animate-pulse">
        <div className="h-48 rounded bg-[var(--color-void)]" />
      </section>
    </div>
  );
}
