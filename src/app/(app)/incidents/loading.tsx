export default function IncidentsLoading() {
  return (
    <div className="page-shell page-stack">
      {/* Hero */}
      <section className="dash-hero">
        <div className="dash-hero-inner">
          <div className="dash-hero-text">
            <div className="h-3 w-16 rounded bg-[var(--color-rim)] animate-pulse" />
            <div className="h-7 w-32 rounded bg-[var(--color-rim)] animate-pulse" />
          </div>
          <div className="page-header-actions">
            <div className="h-9 w-32 rounded-[var(--radius-md)] bg-[var(--color-signal-dim)] animate-pulse" />
          </div>
        </div>
      </section>

      {/* 4 stat cards */}
      <section className="dash-stats" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="dash-stat-card animate-pulse" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="h-9 w-9 rounded-[var(--radius-sm)] bg-[var(--color-rim)]" />
            <div className="h-7 w-12 rounded bg-[var(--color-rim)] mt-2" />
            <div className="h-3 w-24 rounded bg-[var(--color-rim)] mt-2" />
          </div>
        ))}
      </section>

      {/* Filter bar */}
      <section>
        <div className="surface p-4 animate-pulse">
          <div className="grid gap-4 lg:grid-cols-[repeat(4,minmax(0,1fr))_1.4fr_auto]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-12 rounded bg-[var(--color-rim)]" />
                <div className="h-9 w-full rounded bg-[var(--color-void)]" />
              </div>
            ))}
            <div className="flex items-end">
              <div className="h-9 w-16 rounded-[var(--radius-md)] bg-[var(--color-rim)]" />
            </div>
          </div>
        </div>
      </section>

      {/* Table */}
      <div className="table-shell overflow-hidden animate-pulse">
        <table className="w-full">
          <thead>
            <tr>
              {["w-16", "w-20", "w-56", "w-24", "w-20", "w-20", "w-4"].map((w, i) => (
                <th key={i}><div className={`h-3 ${w} rounded bg-[var(--color-rim)]`} /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} style={{ animationDelay: `${i * 30}ms` }}>
                <td><div className="h-5 w-12 rounded bg-[var(--color-rim)]" /></td>
                <td><div className="h-5 w-20 rounded bg-[var(--color-rim)]" /></td>
                <td><div className="h-4 w-48 rounded bg-[var(--color-rim)]" /></td>
                <td><div className="h-4 w-24 rounded bg-[var(--color-rim)]" /></td>
                <td><div className="h-4 w-16 rounded bg-[var(--color-rim)]" /></td>
                <td><div className="h-4 w-16 rounded bg-[var(--color-rim)]" /></td>
                <td><div className="h-4 w-4 rounded bg-[var(--color-rim)]" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
