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
        <div className="mx-auto mt-12 max-w-[400px] rounded-[var(--radius-lg)] border border-[var(--color-rim)] bg-[var(--color-surface)] p-6 text-center">
          <p className="text-sm font-medium text-[var(--color-body)]">Get notified when we publish</p>
          <p className="mt-1 text-xs text-[var(--color-ghost)]">Product updates and incident best practices.</p>
          <form className="mt-4 flex gap-2" action={`mailto:hello@trustloop.dev?subject=Blog%20Subscribe`}>
            <input aria-label="Email address" className="input flex-1" placeholder="Work email" type="email" />
            <button className="btn btn-primary btn-sm" type="submit">Subscribe</button>
          </form>
        </div>
      </section>
    </main>
  );
}
