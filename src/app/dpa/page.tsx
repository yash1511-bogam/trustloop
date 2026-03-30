import type { Metadata } from "next";
import { LegalShell } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Data Processing Agreement — TrustLoop",
  description: "TrustLoop Data Processing Agreement (DPA) for the processing of personal data under GDPR and applicable data protection laws.",
  alternates: { canonical: "/dpa" },
};

export default function DpaPage() {
  return (
    <LegalShell title="Data Processing Agreement" lastUpdated="March 2026">
      <nav className="rounded-[var(--radius-md)] border border-[var(--color-rim)] bg-[var(--color-surface)] p-4 text-sm">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.1em] text-[var(--color-ghost)]">Contents</p>
        <ol className="grid gap-1.5 text-[var(--color-subtext)]">
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#scope">1. Scope and Purpose</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#definitions">2. Definitions</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#details">3. Data Processing Details</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#obligations">4. Processor Obligations</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#controller">5. Controller Obligations</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#subprocessors">6. Sub-processors</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#security">7. Security Measures</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#breach">8. Data Breach Notification</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#rights">9. Data Subject Rights</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#transfers">10. International Transfers</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#audits">11. Audits and Compliance</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#termination">12. Term and Termination</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#contact">13. Contact</a></li>
        </ol>
      </nav>

      <section id="scope">
        <h2>1. Scope and Purpose</h2>
        <p>This Data Processing Agreement (&quot;DPA&quot;) forms part of the Terms of Service (&quot;Agreement&quot;) between you (&quot;Controller&quot;) and TrustLoop, Inc. (&quot;Processor&quot;) and governs the processing of personal data in connection with TrustLoop&apos;s incident operations platform (&quot;Service&quot;).</p>
        <p>This DPA applies to the extent that TrustLoop processes personal data on behalf of the Controller in the course of providing the Service. This DPA is designed to ensure compliance with Article 28 of the General Data Protection Regulation (EU) 2016/679 (&quot;GDPR&quot;), the UK GDPR, the Swiss Federal Act on Data Protection (&quot;FADP&quot;), and other applicable data protection laws.</p>
        <p>In the event of a conflict between this DPA and the Agreement, this DPA shall prevail with respect to the processing of personal data.</p>
      </section>

      <section id="definitions">
        <h2>2. Definitions</h2>
        <p>Capitalized terms not defined herein have the meanings set forth in the Agreement. The following terms have the meanings set forth below:</p>
        <ul>
          <li><strong>&quot;Personal Data&quot;</strong> means any information relating to an identified or identifiable natural person that is processed by TrustLoop on behalf of the Controller in connection with the Service.</li>
          <li><strong>&quot;Processing&quot;</strong> means any operation performed on Personal Data, including collection, recording, organization, structuring, storage, adaptation, retrieval, consultation, use, disclosure, combination, restriction, erasure, or destruction.</li>
          <li><strong>&quot;Data Subject&quot;</strong> means the identified or identifiable natural person to whom the Personal Data relates.</li>
          <li><strong>&quot;Sub-processor&quot;</strong> means any third party engaged by TrustLoop to process Personal Data on behalf of the Controller.</li>
          <li><strong>&quot;Data Breach&quot;</strong> means a breach of security leading to the accidental or unlawful destruction, loss, alteration, unauthorized disclosure of, or access to Personal Data.</li>
        </ul>
      </section>

      <section id="details">
        <h2>3. Data Processing Details</h2>
        <h3 className="text-base font-semibold text-[var(--color-body)] mt-4">3.1 Categories of Data Subjects</h3>
        <ul>
          <li>Workspace owners, administrators, and team members (Authorized Users)</li>
          <li>Customers and end users referenced in incident reports and customer communications</li>
          <li>Third-party contacts included in notification distribution lists</li>
        </ul>
        <h3 className="text-base font-semibold text-[var(--color-body)] mt-4">3.2 Types of Personal Data</h3>
        <ul>
          <li>Contact information: names, email addresses, phone numbers</li>
          <li>Account credentials: hashed authentication tokens, session identifiers</li>
          <li>Incident data: descriptions, severity levels, and customer communications that may contain personal data</li>
          <li>Technical data: IP addresses, browser metadata, API request logs</li>
          <li>Billing data: payment method identifiers, billing addresses, transaction records</li>
        </ul>
        <h3 className="text-base font-semibold text-[var(--color-body)] mt-4">3.3 Processing Activities</h3>
        <ul>
          <li>Storage and retrieval of incident data and customer communications</li>
          <li>AI-powered triage analysis and customer update generation (using Controller-configured BYOK keys)</li>
          <li>Notification delivery via email, Slack, SMS, push notifications, and public status pages</li>
          <li>Authentication, authorization, and session management</li>
          <li>Billing processing and subscription management</li>
          <li>Audit logging and compliance reporting</li>
          <li>Aggregated analytics and service improvement (using anonymized data only)</li>
        </ul>
        <h3 className="text-base font-semibold text-[var(--color-body)] mt-4">3.4 Duration of Processing</h3>
        <p>Processing continues for the duration of the Agreement. Upon termination, Personal Data is handled in accordance with Section 12 of this DPA.</p>
      </section>

      <section id="obligations">
        <h2>4. Processor Obligations</h2>
        <p>TrustLoop shall:</p>
        <ul>
          <li>Process Personal Data only on documented instructions from the Controller, unless required to do so by applicable law (in which case TrustLoop will inform the Controller of that legal requirement before processing, unless prohibited by law)</li>
          <li>Ensure that all personnel authorized to process Personal Data are bound by written confidentiality obligations</li>
          <li>Implement and maintain appropriate technical and organizational security measures as described in Section 7</li>
          <li>Assist the Controller in responding to Data Subject rights requests as described in Section 9</li>
          <li>Assist the Controller in ensuring compliance with obligations related to data protection impact assessments and prior consultation with supervisory authorities, where applicable</li>
          <li>Make available to the Controller all information necessary to demonstrate compliance with this DPA</li>
          <li>Immediately inform the Controller if, in TrustLoop&apos;s opinion, an instruction from the Controller infringes applicable data protection law</li>
          <li>Not process Personal Data for any purpose other than providing the Service, unless explicitly instructed by the Controller</li>
        </ul>
      </section>

      <section id="controller">
        <h2>5. Controller Obligations</h2>
        <p>The Controller shall:</p>
        <ul>
          <li>Ensure that it has a lawful basis for the processing of Personal Data and that all necessary consents or authorizations have been obtained</li>
          <li>Provide documented instructions to TrustLoop regarding the processing of Personal Data</li>
          <li>Ensure that the Personal Data provided to TrustLoop is accurate, complete, and up to date</li>
          <li>Comply with all applicable data protection laws in connection with its use of the Service</li>
          <li>Inform TrustLoop without undue delay of any changes to applicable data protection requirements that may affect TrustLoop&apos;s processing obligations</li>
        </ul>
      </section>

      <section id="subprocessors">
        <h2>6. Sub-processors</h2>
        <p>The Controller provides general authorization for TrustLoop to engage Sub-processors to assist in providing the Service. TrustLoop currently uses the following Sub-processors:</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-rim)]">
                <th className="py-2 pr-4 text-left font-medium text-[var(--color-title)]">Sub-processor</th>
                <th className="py-2 pr-4 text-left font-medium text-[var(--color-title)]">Purpose</th>
                <th className="py-2 text-left font-medium text-[var(--color-title)]">Location</th>
              </tr>
            </thead>
            <tbody className="text-[var(--color-subtext)]">
              <tr className="border-b border-[var(--color-rim)]"><td className="py-2 pr-4">Amazon Web Services (AWS)</td><td className="py-2 pr-4">Cloud infrastructure, compute, storage, SQS</td><td className="py-2">United States</td></tr>
              <tr className="border-b border-[var(--color-rim)]"><td className="py-2 pr-4">Stytch</td><td className="py-2 pr-4">Authentication, OTP, OAuth, SAML SSO</td><td className="py-2">United States</td></tr>
              <tr className="border-b border-[var(--color-rim)]"><td className="py-2 pr-4">Resend</td><td className="py-2 pr-4">Transactional email delivery</td><td className="py-2">United States</td></tr>
              <tr className="border-b border-[var(--color-rim)]"><td className="py-2 pr-4">Twilio</td><td className="py-2 pr-4">SMS notifications and push delivery</td><td className="py-2">United States</td></tr>
              <tr className="border-b border-[var(--color-rim)]"><td className="py-2 pr-4">Dodo Payments</td><td className="py-2 pr-4">Payment processing and subscription billing</td><td className="py-2">United States</td></tr>
              <tr className="border-b border-[var(--color-rim)]"><td className="py-2 pr-4">OpenAI*</td><td className="py-2 pr-4">AI triage and update generation</td><td className="py-2">United States</td></tr>
              <tr className="border-b border-[var(--color-rim)]"><td className="py-2 pr-4">Google (Gemini)*</td><td className="py-2 pr-4">AI triage and update generation</td><td className="py-2">United States</td></tr>
              <tr><td className="py-2 pr-4">Anthropic*</td><td className="py-2 pr-4">AI triage and update generation</td><td className="py-2">United States</td></tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-[var(--color-ghost)]">* AI providers are engaged only when the Controller configures BYOK keys. The Controller selects which provider(s) to use.</p>
        <p className="mt-4">TrustLoop will notify the Controller at least 14 days before engaging a new Sub-processor or replacing an existing one. If the Controller objects to a new Sub-processor on reasonable data protection grounds, TrustLoop will work with the Controller to find an alternative solution. If no resolution is reached, the Controller may terminate the affected portion of the Service.</p>
      </section>

      <section id="security">
        <h2>7. Security Measures</h2>
        <p>TrustLoop implements the following technical and organizational measures to protect Personal Data:</p>
        <ul>
          <li><strong>Encryption:</strong> Data encrypted at rest using AES-256-GCM (sensitive fields including AI provider keys) and database-level encryption. All data in transit encrypted using TLS 1.2 or higher.</li>
          <li><strong>Access control:</strong> Role-based access control (RBAC) with four permission levels (Owner, Manager, Responder, Viewer). SAML SSO available for Enterprise customers.</li>
          <li><strong>Authentication:</strong> Multi-factor authentication via email OTP, OAuth, and SAML SSO. Session tokens with configurable expiration.</li>
          <li><strong>API security:</strong> Scoped API keys with IP allowlists, expiration controls, and rate limiting. Webhook signature verification (HMAC-SHA256) for all inbound integrations.</li>
          <li><strong>Audit logging:</strong> Comprehensive audit trail of all privileged actions, including authentication events, data access, configuration changes, and billing operations.</li>
          <li><strong>Infrastructure:</strong> Hosted on AWS with network isolation, automated backups, and infrastructure-as-code deployment.</li>
          <li><strong>Vulnerability management:</strong> Regular dependency scanning, security assessments, and prompt patching of identified vulnerabilities.</li>
          <li><strong>Personnel:</strong> All TrustLoop employees with access to Personal Data are bound by written confidentiality agreements and receive data protection training.</li>
        </ul>
      </section>

      <section id="breach">
        <h2>8. Data Breach Notification</h2>
        <p>TrustLoop will notify the Controller of any confirmed Data Breach without undue delay and no later than 72 hours after becoming aware of the breach. The notification will include:</p>
        <ul>
          <li>A description of the nature of the breach, including the categories and approximate number of Data Subjects and records affected</li>
          <li>The name and contact details of TrustLoop&apos;s point of contact for further information</li>
          <li>A description of the likely consequences of the breach</li>
          <li>A description of the measures taken or proposed to address the breach, including measures to mitigate its adverse effects</li>
        </ul>
        <p>TrustLoop will cooperate with the Controller and take reasonable steps to assist in the investigation, mitigation, and remediation of the breach. TrustLoop will document all Data Breaches, including the facts, effects, and remedial actions taken.</p>
      </section>

      <section id="rights">
        <h2>9. Data Subject Rights</h2>
        <p>TrustLoop will assist the Controller in fulfilling its obligations to respond to Data Subject rights requests under applicable data protection law, including requests for access, rectification, erasure, restriction, portability, and objection.</p>
        <p>If TrustLoop receives a request directly from a Data Subject, TrustLoop will promptly redirect the request to the Controller, unless legally required to respond directly. TrustLoop will not independently respond to Data Subject requests without the Controller&apos;s prior written authorization.</p>
        <p>TrustLoop provides self-service data export and deletion capabilities within the Service to facilitate the Controller&apos;s compliance with Data Subject requests.</p>
      </section>

      <section id="transfers">
        <h2>10. International Transfers</h2>
        <p>Personal Data is processed primarily in the United States. For transfers of Personal Data from the EEA, United Kingdom, or Switzerland to the United States, the parties agree to the Standard Contractual Clauses (SCCs) adopted by the European Commission (Commission Implementing Decision (EU) 2021/914), which are incorporated by reference into this DPA.</p>
        <p>For transfers subject to the UK GDPR, the International Data Transfer Addendum to the EU SCCs (issued by the UK Information Commissioner) applies. For transfers subject to the Swiss FADP, the SCCs apply with the modifications required by the Swiss Federal Data Protection and Information Commissioner.</p>
        <p>TrustLoop will implement supplementary measures as necessary to ensure that the level of protection of Personal Data is not undermined by the transfer.</p>
      </section>

      <section id="audits">
        <h2>11. Audits and Compliance</h2>
        <p>TrustLoop will make available to the Controller all information reasonably necessary to demonstrate compliance with this DPA and allow for and contribute to audits, including inspections, conducted by the Controller or an independent auditor mandated by the Controller.</p>
        <p>Audit requests must be submitted in writing with at least 30 days&apos; notice. Audits shall be conducted during normal business hours, no more than once per year (unless required by a supervisory authority or following a Data Breach), and shall not unreasonably disrupt TrustLoop&apos;s operations. The Controller shall bear the costs of any audit.</p>
        <p>Where TrustLoop has obtained relevant third-party certifications or audit reports (e.g., SOC 2), TrustLoop may provide these reports to satisfy audit requests, subject to confidentiality obligations.</p>
      </section>

      <section id="termination">
        <h2>12. Term and Termination</h2>
        <p>This DPA remains in effect for the duration of the Agreement. Upon termination of the Agreement:</p>
        <ul>
          <li>TrustLoop will cease processing Personal Data on behalf of the Controller, except as required by applicable law</li>
          <li>At the Controller&apos;s election (to be communicated within 30 days of termination), TrustLoop will either return all Personal Data to the Controller in a standard machine-readable format or securely delete all Personal Data</li>
          <li>If no election is made within 30 days, TrustLoop will securely delete all Personal Data</li>
          <li>TrustLoop will certify the deletion of Personal Data in writing upon the Controller&apos;s request</li>
          <li>Audit logs will be retained for 12 months following termination for compliance purposes, after which they will be securely deleted</li>
        </ul>
      </section>

      <section id="contact">
        <h2>13. Contact</h2>
        <p>To execute this DPA, request a signed copy, or for data protection inquiries:</p>
        <ul>
          <li>DPA and legal inquiries: hello@yashbogam.me</li>
          <li>Data protection officer: hello@yashbogam.me</li>
          <li>Security incidents: hello@yashbogam.me</li>
          <li>Address: Plot No 25, Hyderabad, 500001, Telangana, India</li>
        </ul>
      </section>
    </LegalShell>
  );
}
