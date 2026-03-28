export default function AppLoading() {
  return (
    <div className="page-shell page-stack">
      <section className="page-header">
        <div className="page-header-main">
          <div className="h-3 w-24 rounded bg-[var(--color-rim)] animate-pulse" />
          <div className="h-7 w-48 rounded bg-[var(--color-rim)] animate-pulse" />
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="metric-card animate-pulse" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="h-2.5 w-20 rounded bg-[var(--color-rim)]" />
            <div className="h-8 w-12 rounded bg-[var(--color-rim)]" />
          </div>
        ))}
      </section>
      <section className="surface animate-pulse min-h-[300px]" />
    </div>
  );
}
