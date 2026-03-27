"use client";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
      <h2 className="font-[var(--font-heading)] text-[24px] font-bold text-[var(--color-title)]">
        Something went wrong
      </h2>
      <p className="max-w-[400px] text-center text-[14px] text-[var(--color-subtext)]">
        An unexpected error occurred. Please try again or contact support if the
        problem persists.
      </p>
      <button className="btn btn-primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
