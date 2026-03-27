export default function AboutPage() {
  return (
    <main className="page-shell page-stack">
      <section className="marketing-section !pt-12">
        <div className="mx-auto max-w-[760px]">
          <p className="page-kicker">About</p>
          <h1 className="font-[var(--font-heading)] text-[40px] font-bold leading-[1.02] text-[var(--color-title)]">
            TrustLoop was built for the moment everything goes sideways.
          </h1>
          <div className="mt-6 grid gap-5 text-[16px] leading-7 text-[var(--color-subtext)]">
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
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-header">
          <h2 className="settings-section-title">Team</h2>
          <p className="settings-section-description">
            A compact team focused on product design, infrastructure rigor, and operational clarity.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { role: "Product Design", desc: "Shapes the interface, interaction patterns, and visual language that responders rely on under pressure." },
            { role: "Infrastructure", desc: "Builds the data layer, queue systems, and deployment pipelines that keep TrustLoop reliable at scale." },
            { role: "Response Systems", desc: "Designs the triage, escalation, and communication workflows that drive incident resolution." },
          ].map((member) => (
            <article className="surface p-5" key={member.role}>
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--color-rim)] bg-[linear-gradient(135deg,var(--color-raised),var(--color-void))]">
                <span className="font-[var(--font-heading)] text-[20px] font-bold text-[var(--color-ghost)]">
                  {member.role.charAt(0)}
                </span>
              </div>
              <h3 className="font-[var(--font-heading)] text-[20px] font-semibold text-[var(--color-title)]">{member.role}</h3>
              <p className="mt-2 text-[14px] text-[var(--color-subtext)]">{member.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-header">
          <h2 className="settings-section-title">Contact</h2>
          <p className="settings-section-description">For product, security, or sales conversations.</p>
        </div>
        <a className="btn btn-ghost w-fit" href="mailto:hello@trustloop.dev">hello@trustloop.dev</a>
      </section>
    </main>
  );
}
