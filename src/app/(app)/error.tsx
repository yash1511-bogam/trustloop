"use client";

import { Warning } from "@phosphor-icons/react";

export default function AppError({
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
      <h2 className="font-[var(--font-heading)] text-[24px] font-bold text-[var(--color-title)]">
        Something went wrong
      </h2>
      <p className="max-w-[400px] text-center text-[14px] leading-6 text-[var(--color-subtext)]">
        An unexpected error occurred. Please try again or contact support if the
        problem persists.
      </p>
      <button className="btn btn-primary" onClick={reset} type="button">
        Try again
      </button>
    </div>
  );
}
