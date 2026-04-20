import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { articleSchema, breadcrumbSchema, SeoSchemas } from "@/lib/seo-schemas";

export const metadata: Metadata = {
  title: "About — TrustLoop",
  description: "TrustLoop was built for the moment everything goes sideways. Learn about the team and mission behind the platform.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
    <SeoSchemas schemas={[
      articleSchema({ headline: "About — TrustLoop", description: "Learn about the team and mission behind TrustLoop.", path: "/about", datePublished: "2026-01-15", dateModified: "2026-03-15" }),
      breadcrumbSchema([{ name: "About", path: "/about" }]),
    ]} />
    <PageShell kicker="About" title="TrustLoop was built for the moment everything goes sideways.">
      <div className="grid gap-5 text-[15px] leading-7 text-[var(--color-subtext)]">
        <p>
          TrustLoop started from a simple observation: AI incidents do not behave like ordinary outages. The blast radius is stranger, the customer communication is riskier, and the decision pressure is much higher.
        </p>
        <p>
          We wanted a workspace that gives responders structure without drama. A system that helps teams detect, triage, communicate, and learn from failures with the same calm precision they expect from the rest of their stack.
        </p>
        <p>
          The product is intentionally opinionated because incident operations should not feel like assembling a dashboard while the building is on fire.
        </p>
      </div>

      <section className="mt-12">
        <h2 className="font-[var(--font-heading)] text-[20px] font-bold text-[var(--color-title)]">Team</h2>
        <p className="mt-2 text-sm text-[var(--color-subtext)]">A compact team focused on product design, infrastructure rigor, and operational clarity.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { role: "Product Design", desc: "Shapes the interface, interaction patterns, and visual language that responders rely on under pressure." },
            { role: "Infrastructure", desc: "Builds the data layer, queue systems, and deployment pipelines that keep TrustLoop reliable at scale." },
            { role: "Response Systems", desc: "Designs the triage, escalation, and communication workflows that drive incident resolution." },
          ].map((member) => (
            <article className="rounded-[var(--radius-lg)] border border-[var(--color-rim)] bg-[var(--color-surface)] p-5" key={member.role}>
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--color-rim)] bg-[linear-gradient(135deg,var(--color-raised),var(--color-void))]">
                <span className="font-[var(--font-heading)] text-[20px] font-bold text-[var(--color-ghost)]">{member.role.charAt(0)}</span>
              </div>
              <h3 className="font-[var(--font-heading)] text-[18px] font-semibold text-[var(--color-title)]">{member.role}</h3>
              <p className="mt-2 text-[14px] text-[var(--color-subtext)]">{member.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-[var(--font-heading)] text-[20px] font-bold text-[var(--color-title)]">Contact</h2>
        <p className="mt-2 text-sm text-[var(--color-subtext)]">For product, security, or sales conversations.</p>
        <a className="mt-4 inline-block text-sm text-[var(--color-signal)] hover:underline" href="mailto:hello@yashbogam.me">hello@yashbogam.me</a>
      </section>
    </PageShell>
    </>
  );
}
