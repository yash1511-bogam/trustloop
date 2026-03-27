export default function SettingsLoading() {
  return (
    <div className="flex-1 flex flex-col gap-6 p-6 animate-pulse">
      <div className="h-8 w-36 rounded-md bg-[var(--color-surface)]" />
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-[var(--color-surface)]" />
        ))}
      </div>
    </div>
  );
}
