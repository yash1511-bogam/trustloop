export function InternalStatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-rim)] bg-[#101113] p-4">
      <p className="text-xs text-[var(--color-ghost)]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[var(--color-title)]">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-[var(--color-ghost)]">{sub}</p>}
    </div>
  );
}
