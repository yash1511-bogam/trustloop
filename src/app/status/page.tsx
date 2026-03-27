import Link from "next/link";

export default function StatusIndexPage() {
  return (
    <main className="page-shell page-stack">
      <section className="marketing-section !pt-12 text-center">
        <p className="page-kicker">Status</p>
        <h1 className="font-[var(--font-heading)] text-[40px] font-bold text-[var(--color-title)]">
          Public status pages are workspace-specific.
        </h1>
        <p className="mx-auto mt-5 max-w-[520px] text-[16px] leading-7 text-[var(--color-subtext)]">
          If your team already has a public status page, open the workspace-specific URL provided by your TrustLoop admin.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link className="btn btn-primary" href="/">Return home</Link>
          <Link className="btn btn-ghost" href="/docs">Read the docs</Link>
        </div>

        <div className="mx-auto mt-12 max-w-[480px] rounded-[var(--radius-xl)] border border-[var(--color-rim)] bg-[var(--color-surface)] p-6">
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-[var(--color-ghost)]">What a status page includes</p>
          <ul className="mt-4 grid gap-3 text-left text-[14px] text-[var(--color-subtext)]">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--color-resolve)]" />
              Real-time incident status and severity indicators
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--color-warning)]" />
              Customer-facing updates published by your team
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--color-info)]" />
              Email subscription for incident notifications
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
