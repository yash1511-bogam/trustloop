export default function IncidentsLoading() {
  return (
    <div className="flex-1 flex flex-col gap-6 p-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 rounded-md bg-[var(--color-surface)]" />
        <div className="h-9 w-36 rounded-md bg-[var(--color-surface)]" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-[var(--color-surface)]" />
        ))}
      </div>
    </div>
  );
}
