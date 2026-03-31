"use client";

import { Warning } from "@phosphor-icons/react";

export default function ExecutiveError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8">
      <span className="rounded-full bg-[rgba(232,66,66,0.08)] p-4">
        <Warning color="var(--color-danger)" size={32} weight="duotone" />
      </span>
      <h2 className="font-[var(--font-heading)] text-[20px] font-bold text-[var(--color-title)]">
        Executive view failed to load
      </h2>
      <p className="max-w-[400px] text-center text-[14px] leading-6 text-[var(--color-subtext)]">
        We couldn&apos;t load the executive dashboard. Please try again.
      </p>
      <button className="btn btn-primary" onClick={reset} type="button">
        Retry
      </button>
    </div>
  );
}
