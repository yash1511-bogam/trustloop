import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--color-void)] px-6">
      <div className="relative text-center">
        <div className="pointer-events-none absolute inset-x-0 top-[-92px] font-[var(--font-heading)] text-[120px] font-extrabold leading-none text-[rgba(232,87,42,0.08)]">
          404
        </div>
        <div className="relative z-10 grid justify-items-center gap-4">
          <h1 className="font-[var(--font-heading)] text-[32px] font-bold text-[var(--color-title)]">Page not found.</h1>
          <p className="max-w-[360px] text-[14px] leading-6 text-[var(--color-subtext)]">
            The route you requested does not exist or is no longer publicly available.
          </p>
          <Link className="btn btn-primary" href="/">← Return home</Link>
        </div>
      </div>
    </main>
  );
}
