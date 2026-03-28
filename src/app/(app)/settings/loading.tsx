export default function SettingsLoading() {
  return (
    <div className="page-stack">
      <section className="page-header">
        <div className="page-header-main">
          <div className="h-3 w-20 rounded bg-[var(--color-rim)] animate-pulse" />
          <div className="h-7 w-48 rounded bg-[var(--color-rim)] animate-pulse" />
        </div>
      </section>
      <section className="settings-section">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="surface p-6 animate-pulse" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="h-5 w-32 rounded bg-[var(--color-rim)]" />
            <div className="mt-3 h-3 w-64 rounded bg-[var(--color-surface)]" />
            <div className="mt-6 h-9 w-full rounded bg-[var(--color-void)]" />
          </div>
        ))}
      </section>
    </div>
  );
}
