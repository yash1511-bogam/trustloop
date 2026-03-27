export default function DashboardLoading() {
  return (
    <div className="flex-1 flex flex-col gap-6 p-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 rounded-md bg-[var(--color-surface)]" />
        <div className="h-9 w-32 rounded-md bg-[var(--color-surface)]" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-[var(--color-surface)]" />
        ))}
      </div>
      <div className="flex-1 rounded-xl bg-[var(--color-surface)] min-h-[300px]" />
    </div>
  );
}
