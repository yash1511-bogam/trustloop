import type { Metadata } from "next";
import { LegalShell } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Privacy Policy — TrustLoop",
  description: "TrustLoop Privacy Policy describing how we collect, use, store, and protect your personal information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalShell title="Privacy Policy" lastUpdated="March 2026">
      <nav className="rounded-[var(--radius-md)] border border-[var(--color-rim)] bg-[var(--color-surface)] p-4 text-sm">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.1em] text-[var(--color-ghost)]">Contents</p>
        <ol className="grid gap-1.5 text-[var(--color-subtext)]">
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#scope">1. Scope</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#collect">2. Information We Collect</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#use">3. How We Use Your Information</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#sharing">4. Information Sharing and Disclosure</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#ai">5. AI Data Processing</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#cookies">6. Cookies and Tracking Technologies</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#retention">7. Data Retention</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#security">8. Data Security</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#transfers">9. International Data Transfers</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#rights">10. Your Rights</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#children">11. Children&apos;s Privacy</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#changes">12. Changes to This Policy</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#contact">13. Contact</a></li>
        </ol>
      </nav>

      <section id="scope">
        <h2>1. Scope</h2>
        <p>This Privacy Policy describes how TrustLoop, Inc. (&quot;TrustLoop,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) collects, uses, stores, and protects personal information when you use the TrustLoop incident operations platform (&quot;Service&quot;), visit our website, or interact with us. This policy applies to all users, including Workspace owners, administrators, team members, and visitors.</p>
      </section>

      <section id="collect">
        <h2>2. Information We Collect</h2>
        <h3 className="text-base font-semibold text-[var(--color-body)] mt-4">2.1 Information You Provide</h3>
        <ul>
          <li><strong>Account information:</strong> Full name, email address, company name, and role when you register a Workspace or are invited to one</li>
          <li><strong>Billing information:</strong> Payment method details, billing address, and tax identifiers processed through our payment provider (Dodo Payments). TrustLoop does not store full credit card numbers.</li>
          <li><strong>Incident data:</strong> Incident reports, descriptions, severity levels, customer communications, and any attachments you submit to the Service</li>
          <li><strong>Integration credentials:</strong> Slack tokens, webhook URLs, and AI provider API keys you configure. AI keys are encrypted at rest using AES-256-GCM.</li>
          <li><strong>Communications:</strong> Messages you send to our support team, feedback, and early access requests</li>
        </ul>
        <h3 className="text-base font-semibold text-[var(--color-body)] mt-4">2.2 Information Collected Automatically</h3>
        <ul>
          <li><strong>Usage data:</strong> Pages visited, features used, actions taken, timestamps, and session duration</li>
          <li><strong>Device and network data:</strong> IP address, browser type and version, operating system, device identifiers, and referring URLs</li>
          <li><strong>Log data:</strong> Server logs, error reports, and API request metadata</li>
        </ul>
      </section>

      <section id="use">
        <h2>3. How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide, operate, and maintain the Service, including incident processing, AI-powered triage, and notification delivery</li>
          <li>Process payments, manage subscriptions, and enforce plan quotas</li>
          <li>Authenticate users and enforce role-based access controls</li>
          <li>Send transactional communications, including incident alerts, billing receipts, payment failure reminders, and security notifications</li>
          <li>Provide customer support and respond to inquiries</li>
          <li>Monitor and improve the performance, reliability, and security of the Service</li>
          <li>Detect, prevent, and address fraud, abuse, and security incidents</li>
          <li>Generate aggregated, anonymized analytics to improve the Service</li>
          <li>Comply with legal obligations and enforce our Terms of Service</li>
        </ul>
      </section>

      <section id="sharing">
        <h2>4. Information Sharing and Disclosure</h2>
        <p>TrustLoop does not sell your personal information. We share information only in the following circumstances:</p>
        <ul>
          <li><strong>Service providers:</strong> We use third-party providers to operate the Service, including AWS (cloud infrastructure), Stytch (authentication and SSO), Resend (transactional email), Twilio (SMS and push notifications), and Dodo Payments (billing). These providers process data solely on our behalf and are bound by contractual data protection obligations.</li>
          <li><strong>AI providers:</strong> When you configure AI provider keys (BYOK), incident data is sent to the provider you select (OpenAI, Google Gemini, or Anthropic) for triage and update generation. TrustLoop does not control how these providers process data beyond the scope of their published APIs. Review each provider&apos;s privacy policy before configuring keys.</li>
          <li><strong>Legal requirements:</strong> We may disclose information if required by law, subpoena, court order, or governmental request, or if we believe disclosure is necessary to protect our rights, your safety, or the safety of others.</li>
          <li><strong>Business transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of the transaction. We will notify you of any such transfer and any choices you may have regarding your information.</li>
          <li><strong>With your consent:</strong> We may share information with third parties when you explicitly authorize us to do so.</li>
        </ul>
      </section>

      <section id="ai">
        <h2>5. AI Data Processing</h2>
        <p>TrustLoop uses AI to provide incident triage, customer update drafting, and post-mortem generation. Important details about AI data processing:</p>
        <ul>
          <li>AI features use a Bring Your Own Key (BYOK) model. You configure and control which AI provider processes your data.</li>
          <li>AI provider keys are encrypted at rest using AES-256-GCM and are never exposed in logs, API responses, or to other Workspaces.</li>
          <li>TrustLoop does not use your Customer Data to train, fine-tune, or improve AI models. Data sent to AI providers is governed by the provider&apos;s API terms.</li>
          <li>All AI-generated outputs (triage assessments, customer update drafts) are presented for human review and require explicit approval before distribution.</li>
          <li>You may disable AI features at any time from your Workspace settings.</li>
        </ul>
      </section>

      <section id="cookies">
        <h2>6. Cookies and Tracking Technologies</h2>
        <p>TrustLoop uses cookies and similar technologies for:</p>
        <ul>
          <li><strong>Essential cookies:</strong> Session management, authentication, and security (required for the Service to function)</li>
          <li><strong>Analytics cookies:</strong> Aggregated usage analytics to understand how the Service is used and to identify areas for improvement</li>
        </ul>
        <p>We do not use third-party advertising cookies or cross-site tracking. You can manage cookie preferences through your browser settings. Disabling essential cookies may prevent you from using the Service.</p>
      </section>

      <section id="retention">
        <h2>7. Data Retention</h2>
        <p>We retain your information for as long as your account is active or as needed to provide the Service. Specific retention periods:</p>
        <ul>
          <li><strong>Account and incident data:</strong> Retained while your Workspace is active. Upon Workspace deletion or account termination, Customer Data is permanently deleted within 30 days.</li>
          <li><strong>Audit logs:</strong> Retained for 12 months for compliance and security purposes.</li>
          <li><strong>Billing records:</strong> Retained for 7 years as required by tax and financial regulations.</li>
          <li><strong>Server logs:</strong> Retained for 90 days for security monitoring and debugging.</li>
          <li><strong>Early access requests:</strong> Retained until you request deletion or your account is created.</li>
        </ul>
      </section>

      <section id="security">
        <h2>8. Data Security</h2>
        <p>TrustLoop implements industry-standard technical and organizational measures to protect your information:</p>
        <ul>
          <li>Encryption at rest (AES-256-GCM for sensitive fields, database-level encryption) and in transit (TLS 1.2+)</li>
          <li>Role-based access control (RBAC) with Owner, Manager, Responder, and Viewer roles</li>
          <li>SAML SSO support for Enterprise customers</li>
          <li>Comprehensive audit logging of all privileged actions</li>
          <li>API key scoping with IP allowlists and expiration controls</li>
          <li>Webhook signature verification for all inbound integrations</li>
          <li>Regular security assessments and dependency vulnerability scanning</li>
        </ul>
        <p>While we strive to protect your information, no method of electronic transmission or storage is 100% secure. You acknowledge and accept the inherent risks of transmitting information over the internet.</p>
      </section>

      <section id="transfers">
        <h2>9. International Data Transfers</h2>
        <p>TrustLoop processes data primarily in the United States. If you are located outside the United States, your information will be transferred to and processed in the United States.</p>
        <p>For transfers of personal data from the European Economic Area (EEA), United Kingdom, or Switzerland, we rely on Standard Contractual Clauses (SCCs) approved by the European Commission as the legal transfer mechanism. A copy of the applicable SCCs is available upon request.</p>
      </section>

      <section id="rights">
        <h2>10. Your Rights</h2>
        <p>Depending on your jurisdiction, you may have the following rights regarding your personal information:</p>
        <ul>
          <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
          <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
          <li><strong>Deletion:</strong> Request deletion of your personal information, subject to legal retention requirements</li>
          <li><strong>Portability:</strong> Request a machine-readable export of your data</li>
          <li><strong>Restriction:</strong> Request that we restrict processing of your information in certain circumstances</li>
          <li><strong>Objection:</strong> Object to processing of your information for certain purposes</li>
          <li><strong>Withdraw consent:</strong> Where processing is based on consent, withdraw your consent at any time</li>
        </ul>
        <p>To exercise any of these rights, contact <a className="text-[var(--color-signal)] hover:underline" href="mailto:hello@yashbogam.me">hello@yashbogam.me</a>. We will respond to verified requests within 30 days (or within the timeframe required by applicable law). We may request additional information to verify your identity before processing your request.</p>
        <p><strong>EEA, UK, and Swiss residents:</strong> You have the right to lodge a complaint with your local data protection authority if you believe your rights have been violated.</p>
        <p><strong>California residents:</strong> Under the California Consumer Privacy Act (CCPA), you have the right to know what personal information we collect, request deletion, and opt out of the sale of personal information. TrustLoop does not sell personal information.</p>
      </section>

      <section id="children">
        <h2>11. Children&apos;s Privacy</h2>
        <p>The Service is not directed to individuals under the age of 16. We do not knowingly collect personal information from children. If we become aware that we have collected personal information from a child under 16, we will take steps to delete that information promptly. If you believe a child has provided us with personal information, please contact <a className="text-[var(--color-signal)] hover:underline" href="mailto:hello@yashbogam.me">hello@yashbogam.me</a>.</p>
      </section>

      <section id="changes">
        <h2>12. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on this page with a revised &quot;Last updated&quot; date and, where required, by sending an email notification to Workspace owners. Your continued use of the Service after the effective date of any changes constitutes your acceptance of the revised policy.</p>
      </section>

      <section id="contact">
        <h2>13. Contact</h2>
        <p>If you have questions or concerns about this Privacy Policy or our data practices, please contact us:</p>
        <ul>
          <li>Privacy inquiries: <a className="text-[var(--color-signal)] hover:underline" href="mailto:hello@yashbogam.me">hello@yashbogam.me</a></li>
          <li>Data protection officer: <a className="text-[var(--color-signal)] hover:underline" href="mailto:hello@yashbogam.me">hello@yashbogam.me</a></li>
          <li>Address: Plot No 25, Hyderabad, 500001, Telangana, India</li>
        </ul>
      </section>
    </LegalShell>
  );
}
