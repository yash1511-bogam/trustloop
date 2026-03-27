"use client";

export default function IncidentsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
      <h2 className="font-[var(--font-heading)] text-[20px] font-bold text-[var(--color-title)]">
        Incidents failed to load
      </h2>
      <p className="max-w-[400px] text-center text-[14px] text-[var(--color-subtext)]">
        We couldn&apos;t load your incidents. Please try again.
      </p>
      <button className="btn btn-primary" onClick={reset}>
        Retry
      </button>
    </div>
  );
}
