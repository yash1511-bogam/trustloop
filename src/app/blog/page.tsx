import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { breadcrumbSchema, SeoSchemas } from "@/lib/seo-schemas";

export const metadata: Metadata = {
  title: "Blog — TrustLoop",
  description: "Product updates, incident best practices, and long-form writing from the TrustLoop team.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  return (
    <>
    <SeoSchemas schemas={[breadcrumbSchema([{ name: "Blog", path: "/blog" }])]} />
    <PageShell kicker="Blog" title="Long-form writing is coming soon." subtitle="Product updates and incident best practices from the TrustLoop team.">
      <p className="max-w-[560px] text-[15px] leading-7 text-[var(--color-subtext)]">
        In the meantime, the changelog covers what is shipping now and the security page outlines how the platform is built.
      </p>
      <div className="mt-8 flex gap-3">
        <Link className="btn btn-primary" href="/changelog">Open changelog</Link>
        <Link className="btn btn-ghost" href="/security">Security overview</Link>
      </div>
      <div className="mt-12 max-w-[400px] rounded-[var(--radius-lg)] border border-[var(--color-rim)] bg-[var(--color-surface)] p-6">
        <p className="text-sm font-medium text-[var(--color-body)]">Get notified when we publish</p>
        <p className="mt-1 text-xs text-[var(--color-ghost)]">Product updates and incident best practices.</p>
        <form className="mt-4 flex gap-2" action={`mailto:hello@yashbogam.me?subject=Blog%20Subscribe`}>
          <input aria-label="Email address" className="input flex-1" placeholder="Work email" type="email" />
          <button className="btn btn-primary btn-sm" type="submit">Subscribe</button>
        </form>
      </div>
    </PageShell>
    </>
  );
}
