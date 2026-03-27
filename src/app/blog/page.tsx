import Link from "next/link";

export default function BlogPage() {
  return (
    <main className="page-shell page-stack">
      <section className="marketing-section !pt-12 text-center">
        <p className="page-kicker">Blog</p>
        <h1 className="font-[var(--font-heading)] text-[40px] font-bold text-[var(--color-title)]">
          Long-form writing is coming soon.
        </h1>
        <p className="mx-auto mt-5 max-w-[520px] text-[16px] leading-7 text-[var(--color-subtext)]">
          In the meantime, the changelog covers what is shipping now and the security page outlines how the platform is built.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link className="btn btn-primary" href="/changelog">Open changelog</Link>
          <Link className="btn btn-ghost" href="/security">Security overview</Link>
        </div>
      </section>
    </main>
  );
}
