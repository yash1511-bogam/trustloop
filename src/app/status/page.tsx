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
        <div className="mt-8 flex justify-center">
          <Link className="btn btn-primary" href="/">Return home</Link>
        </div>
      </section>
    </main>
  );
}
