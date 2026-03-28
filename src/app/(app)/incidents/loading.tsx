export default function IncidentsLoading() {
  return (
    <div className="page-shell page-stack">
      <section className="page-header">
        <div className="page-header-main">
          <div className="h-3 w-16 rounded bg-[var(--color-rim)] animate-pulse" />
          <div className="h-7 w-40 rounded bg-[var(--color-rim)] animate-pulse" />
        </div>
        <div className="page-header-actions">
          <div className="h-9 w-28 rounded-[var(--radius-md)] bg-[var(--color-surface)] animate-pulse" />
        </div>
      </section>
      <section className="table-shell animate-pulse">
        <div className="h-10 border-b border-[var(--color-rim)]" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 border-b border-[var(--color-rim)]" style={{ animationDelay: `${i * 30}ms` }} />
        ))}
      </section>
    </div>
  );
}
