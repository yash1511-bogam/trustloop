import type { Metadata } from "next";
import { LegalShell } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Terms of Service — TrustLoop",
  description: "TrustLoop Terms of Service governing use of the incident operations platform.",
  alternates: { canonical: "/terms" },
};

export default function TermsOfServicePage() {
  return (
    <LegalShell title="Terms of Service" lastUpdated="March 2026">
      <nav className="rounded-[var(--radius-md)] border border-[var(--color-rim)] bg-[var(--color-surface)] p-4 text-sm">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.1em] text-[var(--color-ghost)]">Contents</p>
        <ol className="grid gap-1.5 text-[var(--color-subtext)]">
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#acceptance">1. Acceptance of Terms</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#definitions">2. Definitions</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#service">3. Service Description</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#account">4. Account Registration and Security</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#use">5. Acceptable Use Policy</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#billing">6. Billing, Payment, and Taxes</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#trial">7. Free Trials</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#data">8. Data Ownership and Licensing</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#ip">9. Intellectual Property</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#confidentiality">10. Confidentiality</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#availability">11. Service Availability and SLA</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#termination">12. Termination and Suspension</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#warranty">13. Warranty Disclaimer</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#liability">14. Limitation of Liability</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#indemnification">15. Indemnification</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#governing">16. Governing Law and Dispute Resolution</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#changes">17. Changes to These Terms</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#contact">18. Contact</a></li>
        </ol>
      </nav>

      <section id="acceptance">
        <h2>1. Acceptance of Terms</h2>
        <p>By accessing or using the TrustLoop platform (&quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you are entering into these Terms on behalf of a company or other legal entity (&quot;Organization&quot;), you represent and warrant that you have the authority to bind that Organization to these Terms. If you do not agree to these Terms, you may not access or use the Service.</p>
        <p>These Terms constitute a legally binding agreement between you and TrustLoop, Inc. (&quot;TrustLoop,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).</p>
      </section>

      <section id="definitions">
        <h2>2. Definitions</h2>
        <p><strong>&quot;Workspace&quot;</strong> means an isolated organizational unit within TrustLoop that contains your incidents, team members, integrations, and billing configuration.</p>
        <p><strong>&quot;Customer Data&quot;</strong> means all data, content, and information submitted to the Service by you or on your behalf, including incident reports, customer communications, and configuration settings.</p>
        <p><strong>&quot;Authorized User&quot;</strong> means any individual who is granted access to a Workspace by the Workspace owner or administrator.</p>
        <p><strong>&quot;AI Features&quot;</strong> means the artificial intelligence capabilities of the Service, including incident triage, customer update drafting, and post-mortem generation, powered by third-party AI providers configured by you (BYOK).</p>
        <p><strong>&quot;Plan&quot;</strong> means the subscription tier (Starter, Pro, or Enterprise) that determines the features, quotas, and pricing applicable to your Workspace.</p>
      </section>

      <section id="service">
        <h2>3. Service Description</h2>
        <p>TrustLoop is an incident operations platform designed for AI product teams. The Service provides:</p>
        <ul>
          <li>Incident intake from dashboards, support teams, Slack, and signed webhooks</li>
          <li>AI-powered incident triage using workspace-scoped provider keys (OpenAI, Google Gemini, Anthropic)</li>
          <li>Customer-facing update drafting with approval controls and full audit history</li>
          <li>Automated reminder workflows via asynchronous job processing</li>
          <li>Multi-channel notification delivery (in-app, Slack, email, push notifications, public status pages)</li>
          <li>Executive reporting, operational analytics, and data exports</li>
          <li>Plan-based quotas, feature gates, and billing enforcement per Workspace</li>
        </ul>
        <p>The specific features available to your Workspace depend on your Plan. Feature availability may change as we evolve the Service, and we will provide reasonable notice of material changes.</p>
      </section>

      <section id="account">
        <h2>4. Account Registration and Security</h2>
        <p>To use the Service, you must create a Workspace and register an account with a valid email address. You agree to provide accurate, current, and complete registration information and to keep this information up to date.</p>
        <p>You are solely responsible for:</p>
        <ul>
          <li>Maintaining the confidentiality of your account credentials, session tokens, and API keys</li>
          <li>Safeguarding any AI provider keys you configure within your Workspace</li>
          <li>All activities that occur under your account or Workspace, whether or not authorized by you</li>
          <li>Promptly notifying TrustLoop at <a className="text-[var(--color-signal)] hover:underline" href="mailto:hello@yashbogam.me">hello@yashbogam.me</a> of any unauthorized access or security breach</li>
        </ul>
        <p>TrustLoop encrypts AI provider keys at rest using AES-256-GCM and enforces role-based access controls. However, you acknowledge that no security measure is absolute, and you accept the residual risk of using cloud-based services.</p>
      </section>

      <section id="use">
        <h2>5. Acceptable Use Policy</h2>
        <p>You agree not to use the Service to:</p>
        <ul>
          <li>Violate any applicable law, regulation, or third-party right</li>
          <li>Transmit malicious code, viruses, or any content designed to disrupt the Service</li>
          <li>Attempt to gain unauthorized access to the Service, other accounts, or underlying infrastructure</li>
          <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
          <li>Use the Service to store or process data subject to ITAR, HIPAA, or PCI-DSS unless covered by a separate written agreement</li>
          <li>Exceed the rate limits, quotas, or usage thresholds applicable to your Plan</li>
          <li>Resell, sublicense, or make the Service available to third parties without our prior written consent</li>
        </ul>
        <p>We reserve the right to suspend or terminate access for violations of this policy, with or without notice depending on the severity of the violation.</p>
      </section>

      <section id="billing">
        <h2>6. Billing, Payment, and Taxes</h2>
        <p>Paid Plans are billed in advance on a monthly or annual basis, as selected at the time of purchase. All fees are non-refundable except as expressly stated in our <a className="text-[var(--color-signal)] hover:underline" href="/billing-policy">Billing Policy</a> or as required by applicable law.</p>
        <p>You authorize TrustLoop (via our payment processor, Dodo Payments) to charge your designated payment method for all applicable fees, including taxes. You are responsible for all taxes, duties, and levies imposed by taxing authorities in connection with your use of the Service, excluding taxes based on TrustLoop&apos;s net income.</p>
        <p>If a payment fails, TrustLoop will send reminder notifications to Workspace billing contacts and maintain a recovery window. If billing remains unresolved, TrustLoop may downgrade the Workspace to the Starter plan. See our <a className="text-[var(--color-signal)] hover:underline" href="/billing-policy">Billing Policy</a> for full details on payment recovery and refund review.</p>
      </section>

      <section id="trial">
        <h2>7. Free Trials</h2>
        <p>TrustLoop may offer a 14-day free trial for the Starter plan. During the trial period, you have access to Starter plan features and quotas. At the end of the trial, you must subscribe to a paid Plan to continue using the Service. If you do not subscribe, your Workspace will be downgraded and access to paid features will be restricted.</p>
        <p>We reserve the right to modify or discontinue trial offers at any time without prior notice. Trial eligibility is limited to one trial per Workspace.</p>
      </section>

      <section id="data">
        <h2>8. Data Ownership and Licensing</h2>
        <p>You retain all rights, title, and interest in and to your Customer Data. TrustLoop does not claim ownership of incident data, customer communications, AI provider keys, or any other content you submit to the Service.</p>
        <p>You grant TrustLoop a limited, non-exclusive, worldwide license to use, process, store, and transmit your Customer Data solely to the extent necessary to provide, maintain, and improve the Service, and to comply with applicable law. This license terminates when your Customer Data is deleted from the Service.</p>
        <p>TrustLoop may generate aggregated, anonymized, and de-identified data derived from your use of the Service (&quot;Usage Data&quot;). TrustLoop owns all rights to Usage Data and may use it for product improvement, benchmarking, and analytics purposes.</p>
      </section>

      <section id="ip">
        <h2>9. Intellectual Property</h2>
        <p>The Service, including all software, algorithms, user interfaces, documentation, trademarks, and trade secrets, is the exclusive property of TrustLoop and is protected by intellectual property laws. These Terms do not grant you any right, title, or interest in the Service except for the limited right to use the Service in accordance with these Terms.</p>
        <p>You may provide feedback, suggestions, or ideas about the Service (&quot;Feedback&quot;). You agree that TrustLoop may freely use, incorporate, and commercialize Feedback without obligation or compensation to you.</p>
      </section>

      <section id="confidentiality">
        <h2>10. Confidentiality</h2>
        <p>Each party agrees to protect the other party&apos;s Confidential Information using the same degree of care it uses to protect its own confidential information, but no less than reasonable care. Confidential Information includes, without limitation, Customer Data, pricing terms, security configurations, and any information marked as confidential.</p>
        <p>Confidentiality obligations do not apply to information that: (a) is or becomes publicly available through no fault of the receiving party; (b) was known to the receiving party prior to disclosure; (c) is independently developed without use of the disclosing party&apos;s Confidential Information; or (d) is required to be disclosed by law, provided the receiving party gives prompt notice where legally permitted.</p>
      </section>

      <section id="availability">
        <h2>11. Service Availability and SLA</h2>
        <p>TrustLoop targets 99.9% uptime for the production Service, measured on a monthly basis, excluding scheduled maintenance windows. Scheduled maintenance will be communicated at least 24 hours in advance via email or in-app notification.</p>
        <p>Enterprise Plan customers may be eligible for a Service Level Agreement (SLA) with defined uptime commitments and service credits. Contact <a className="text-[var(--color-signal)] hover:underline" href="mailto:hello@yashbogam.me">hello@yashbogam.me</a> for Enterprise SLA terms.</p>
        <p>TrustLoop is not responsible for downtime caused by: (a) factors outside our reasonable control, including force majeure events; (b) your equipment, software, or network connections; (c) third-party services or AI providers configured by you; or (d) your violation of these Terms.</p>
      </section>

      <section id="termination">
        <h2>12. Termination and Suspension</h2>
        <p>You may cancel your subscription at any time from the Workspace billing settings. Cancellation takes effect at the end of the current billing period, and you will retain access to paid features until that date. No prorated refunds are issued for partial billing periods.</p>
        <p>TrustLoop may suspend or terminate your access to the Service immediately if: (a) you breach these Terms; (b) your account is overdue for payment beyond the recovery window; (c) we are required to do so by law; or (d) your use of the Service poses a security risk to TrustLoop or other users.</p>
        <p>Upon termination, your right to use the Service ceases immediately. TrustLoop will retain your Customer Data for 30 days following termination to allow for data export. After 30 days, Customer Data will be permanently deleted. Audit logs are retained for 12 months for compliance purposes.</p>
      </section>

      <section id="warranty">
        <h2>13. Warranty Disclaimer</h2>
        <p>THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE. TRUSTLOOP SPECIFICALLY DISCLAIMS ALL IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. TRUSTLOOP DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE, OR THAT ANY DEFECTS WILL BE CORRECTED.</p>
        <p>AI Features are provided as decision-support tools and are not a substitute for human judgment. TrustLoop does not guarantee the accuracy, completeness, or reliability of AI-generated outputs, including triage assessments and customer update drafts. You are solely responsible for reviewing and approving all AI-generated content before distribution.</p>
      </section>

      <section id="liability">
        <h2>14. Limitation of Liability</h2>
        <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL TRUSTLOOP&apos;S AGGREGATE LIABILITY ARISING OUT OF OR RELATED TO THESE TERMS EXCEED THE TOTAL AMOUNT PAID BY YOU TO TRUSTLOOP IN THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM.</p>
        <p>IN NO EVENT SHALL TRUSTLOOP BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, BUSINESS OPPORTUNITIES, OR GOODWILL, REGARDLESS OF WHETHER SUCH DAMAGES WERE FORESEEABLE AND WHETHER TRUSTLOOP WAS ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.</p>
        <p>The limitations in this section apply to all causes of action in the aggregate, including breach of contract, tort (including negligence), strict liability, and other legal theories.</p>
      </section>

      <section id="indemnification">
        <h2>15. Indemnification</h2>
        <p>You agree to indemnify, defend, and hold harmless TrustLoop and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorneys&apos; fees) arising out of or in connection with: (a) your use of the Service; (b) your violation of these Terms; (c) your violation of any third-party right; or (d) your Customer Data.</p>
      </section>

      <section id="governing">
        <h2>16. Governing Law and Dispute Resolution</h2>
        <p>These Terms are governed by and construed in accordance with the laws of India. Any dispute arising out of or relating to these Terms shall be resolved exclusively in the courts located in Hyderabad, Telangana, India, and you consent to the personal jurisdiction of such courts.</p>
        <p>Before initiating any formal dispute resolution, you agree to first attempt to resolve the dispute informally by contacting <a className="text-[var(--color-signal)] hover:underline" href="mailto:hello@yashbogam.me">hello@yashbogam.me</a>. If the dispute is not resolved within 30 days, either party may proceed with formal legal action.</p>
      </section>

      <section id="changes">
        <h2>17. Changes to These Terms</h2>
        <p>TrustLoop reserves the right to modify these Terms at any time. We will provide at least 30 days&apos; notice of material changes via email to the Workspace owner or through an in-app notification. Your continued use of the Service after the effective date of any changes constitutes your acceptance of the revised Terms.</p>
        <p>If you do not agree to the revised Terms, you must stop using the Service and cancel your subscription before the changes take effect.</p>
      </section>

      <section id="contact">
        <h2>18. Contact</h2>
        <p>If you have questions about these Terms, please contact us:</p>
        <ul>
          <li>Email: <a className="text-[var(--color-signal)] hover:underline" href="mailto:hello@yashbogam.me">hello@yashbogam.me</a></li>
          <li>Address: Plot No 25, Hyderabad, 500001, Telangana, India</li>
        </ul>
      </section>
    </LegalShell>
  );
}