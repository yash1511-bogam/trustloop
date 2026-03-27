export default function DpaPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="mb-8 text-3xl font-bold text-[var(--color-title)]">Data Processing Agreement</h1>
      <p className="mb-4 text-sm text-[var(--color-ghost)]">Last updated: March 2026</p>
      <div className="prose prose-invert max-w-none space-y-6 text-[var(--color-body)]">
        <section>
          <h2 className="text-xl font-semibold text-[var(--color-body)]">1. Scope and Purpose</h2>
          <p>This Data Processing Agreement (&quot;DPA&quot;) forms part of the agreement between you (&quot;Controller&quot;) and TrustLoop (&quot;Processor&quot;) for the processing of personal data in connection with TrustLoop&apos;s incident operations platform.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[var(--color-body)]">2. Data Processing Details</h2>
          <p><strong>Categories of data subjects:</strong> Your employees, customers, and end users referenced in incident reports.</p>
          <p><strong>Types of personal data:</strong> Names, email addresses, IP addresses, incident descriptions that may contain personal data.</p>
          <p><strong>Processing activities:</strong> Storage, AI-powered triage analysis, customer communication delivery, compliance reporting.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[var(--color-body)]">3. Processor Obligations</h2>
          <p>TrustLoop will: process data only on documented instructions from the Controller; ensure personnel are bound by confidentiality; implement appropriate technical and organizational security measures; assist with data subject rights requests; delete or return data upon termination.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[var(--color-body)]">4. Sub-processors</h2>
          <p>TrustLoop uses the following sub-processors: AWS (infrastructure), Stytch (authentication), Resend (email delivery). AI providers (OpenAI, Google, Anthropic) are used only when you configure BYOK keys.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[var(--color-body)]">5. Security Measures</h2>
          <p>Encryption at rest (AES-256-GCM) and in transit (TLS 1.2+). Role-based access control. Audit logging of all privileged actions. Regular security assessments.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[var(--color-body)]">6. Data Breach Notification</h2>
          <p>TrustLoop will notify the Controller of any personal data breach without undue delay and no later than 72 hours after becoming aware of the breach.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[var(--color-body)]">7. International Transfers</h2>
          <p>Data is processed in the United States. For EU data subjects, Standard Contractual Clauses (SCCs) apply as the transfer mechanism.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[var(--color-body)]">8. Contact</h2>
          <p>To execute this DPA or for data protection inquiries, contact dpa@trustloop.dev.</p>
        </section>
      </div>
    </main>
  );
}
