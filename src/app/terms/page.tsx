export default function TermsOfServicePage() {
  return (
    <main className="legal-page">
      <p className="page-kicker">Legal</p>
      <h1 className="mt-3 font-[var(--font-heading)] text-[32px] font-bold text-[var(--color-title)]">Terms of Service</h1>
      <p className="mt-2 text-sm text-[var(--color-ghost)]">Last updated: March 2026</p>
      <nav className="mt-6 rounded-[var(--radius-md)] border border-[var(--color-rim)] bg-[var(--color-surface)] p-4 text-sm">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.1em] text-[var(--color-ghost)]">Contents</p>
        <ol className="grid gap-1.5 text-[var(--color-subtext)]">
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#acceptance">1. Acceptance of Terms</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#service">2. Service Description</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#account">3. Account Responsibilities</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#use">4. Acceptable Use</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#billing">5. Billing and Payment</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#data">6. Data Ownership</a></li>
        </ol>
      </nav>
      <div className="legal-prose mt-8">
        <section id="acceptance">
          <h2 className="text-xl font-semibold text-[var(--color-body)]">1. Acceptance of Terms</h2>
          <p>By accessing or using TrustLoop, you agree to be bound by these Terms of Service. If you are using TrustLoop on behalf of an organization, you represent that you have authority to bind that organization.</p>
        </section>
        <section id="service">
          <h2 className="text-xl font-semibold text-[var(--color-body)]">2. Service Description</h2>
          <p>TrustLoop is an incident operations platform for AI software companies. We provide incident management, AI-powered triage, customer communication tools, and compliance reporting.</p>
        </section>
        <section id="account">
          <h2 className="text-xl font-semibold text-[var(--color-body)]">3. Account Responsibilities</h2>
          <p>You are responsible for maintaining the security of your account credentials, API keys, and AI provider keys. You must notify us immediately of any unauthorized access.</p>
        </section>
        <section id="use">
          <h2 className="text-xl font-semibold text-[var(--color-body)]">4. Acceptable Use</h2>
          <p>You agree not to use TrustLoop for any unlawful purpose, to transmit malicious content, or to attempt to gain unauthorized access to our systems or other users&apos; data.</p>
        </section>
        <section id="billing">
          <h2 className="text-xl font-semibold text-[var(--color-body)]">5. Billing and Payment</h2>
          <p>Paid plans are billed monthly or annually. You authorize us to charge your payment method on file. Refunds are handled on a case-by-case basis within 30 days of charge.</p>
        </section>
        <section id="data">
          <h2 className="text-xl font-semibold text-[var(--color-body)]">6. Data Ownership</h2>
          <p>You retain all rights to your data. We do not claim ownership of incident data, customer communications, or any content you submit to TrustLoop.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[var(--color-body)]">7. Service Availability</h2>
          <p>We strive for 99.9% uptime but do not guarantee uninterrupted service. Scheduled maintenance windows will be communicated in advance.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[var(--color-body)]">8. Limitation of Liability</h2>
          <p>TrustLoop&apos;s liability is limited to the amount you paid for the service in the 12 months preceding the claim. We are not liable for indirect, incidental, or consequential damages.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[var(--color-body)]">9. Contact</h2>
          <p>For questions about these terms, contact legal@trustloop.dev.</p>
        </section>
      </div>
    </main>
  );
}
