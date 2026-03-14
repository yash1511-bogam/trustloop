export default function TermsOfServicePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="mb-8 text-3xl font-bold text-slate-100">Terms of Service</h1>
      <p className="mb-4 text-sm text-neutral-500">Last updated: March 2026</p>
      <div className="prose prose-invert max-w-none space-y-6 text-neutral-300">
        <section>
          <h2 className="text-xl font-semibold text-slate-200">1. Acceptance of Terms</h2>
          <p>By accessing or using TrustLoop, you agree to be bound by these Terms of Service. If you are using TrustLoop on behalf of an organization, you represent that you have authority to bind that organization.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-200">2. Service Description</h2>
          <p>TrustLoop is an incident operations platform for AI software companies. We provide incident management, AI-powered triage, customer communication tools, and compliance reporting.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-200">3. Account Responsibilities</h2>
          <p>You are responsible for maintaining the security of your account credentials, API keys, and AI provider keys. You must notify us immediately of any unauthorized access.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-200">4. Acceptable Use</h2>
          <p>You agree not to use TrustLoop for any unlawful purpose, to transmit malicious content, or to attempt to gain unauthorized access to our systems or other users&apos; data.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-200">5. Billing and Payment</h2>
          <p>Paid plans are billed monthly or annually. You authorize us to charge your payment method on file. Refunds are handled on a case-by-case basis within 30 days of charge.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-200">6. Data Ownership</h2>
          <p>You retain all rights to your data. We do not claim ownership of incident data, customer communications, or any content you submit to TrustLoop.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-200">7. Service Availability</h2>
          <p>We strive for 99.9% uptime but do not guarantee uninterrupted service. Scheduled maintenance windows will be communicated in advance.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-200">8. Limitation of Liability</h2>
          <p>TrustLoop&apos;s liability is limited to the amount you paid for the service in the 12 months preceding the claim. We are not liable for indirect, incidental, or consequential damages.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-200">9. Contact</h2>
          <p>For questions about these terms, contact legal@trustloop.dev.</p>
        </section>
      </div>
    </main>
  );
}
