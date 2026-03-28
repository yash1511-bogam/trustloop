export default function PrivacyPolicyPage() {
  return (
    <main className="legal-page">
      <p className="page-kicker">Legal</p><h1 className="mt-3 font-[var(--font-heading)] text-[32px] font-bold text-[var(--color-title)]">Privacy Policy</h1>
      <p className="mb-4 text-sm text-[var(--color-ghost)]">Last updated: March 2026</p>
      <div className="prose prose-invert max-w-none space-y-6 text-[var(--color-body)]">
        <section>
          <h2 className="text-xl font-semibold text-[var(--color-body)]">1. Information We Collect</h2>
          <p>We collect information you provide directly: name, email address, workspace name, and incident data you submit. We also collect usage data including IP addresses, browser type, and feature usage patterns.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[var(--color-body)]">2. How We Use Your Information</h2>
          <p>We use your information to provide and improve TrustLoop services, process incidents, run AI triage, send notifications, and communicate with you about your account.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[var(--color-body)]">3. Data Processing</h2>
          <p>Incident data is processed to provide AI-powered triage and customer update generation. AI provider keys you configure (BYOK) are encrypted at rest using AES-256-GCM. We do not train AI models on your data.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[var(--color-body)]">4. Data Retention</h2>
          <p>We retain your data for as long as your account is active. Upon account deletion, data is permanently removed within 30 days. Audit logs are retained for 12 months for compliance purposes.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[var(--color-body)]">5. Data Security</h2>
          <p>We implement industry-standard security measures including encryption at rest and in transit, role-based access controls, and regular security audits.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[var(--color-body)]">6. Your Rights</h2>
          <p>You have the right to access, correct, delete, and export your data. Contact privacy@trustloop.dev to exercise these rights. EU residents have additional rights under GDPR.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[var(--color-body)]">7. Contact</h2>
          <p>For privacy inquiries, contact privacy@trustloop.dev.</p>
        </section>
      </div>
    </main>
  );
}
