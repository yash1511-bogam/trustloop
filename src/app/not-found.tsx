import Link from "next/link";
import { TrustLoopLogo } from "@/components/trustloop-logo";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--color-void)] px-6">
      <div className="relative text-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-[-100px] select-none font-[var(--font-heading)] text-[140px] font-extrabold leading-none text-[rgba(212,98,43,0.06)]"
        >
          404
        </div>
        <div className="relative z-10 grid justify-items-center gap-5">
          <TrustLoopLogo size={20} variant="mark" />
          <h1 className="font-[var(--font-heading)] text-[32px] font-bold tracking-tight text-[var(--color-title)]">
            Page not found
          </h1>
          <p className="max-w-[380px] text-[14px] leading-6 text-[var(--color-subtext)]">
            The route you requested does not exist or is no longer publicly available.
          </p>
          <div className="mt-2 flex gap-3">
            <Link className="btn btn-primary" href="/">
              Return home
            </Link>
            <Link className="btn btn-ghost" href="/dashboard">
              Go to dashboard
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
