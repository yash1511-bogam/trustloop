import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Billing and Refund Policy — TrustLoop",
  description: "TrustLoop billing, renewal, plan changes, payment recovery, and refund policy for workspace subscriptions.",
  alternates: { canonical: "/billing-policy" },
};

export default function BillingPolicyPage() {
  return (
    <LegalShell title="Billing and Refund Policy" lastUpdated="March 2026">
      <nav className="rounded-[var(--radius-md)] border border-[var(--color-rim)] bg-[var(--color-surface)] p-4 text-sm">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.1em] text-[var(--color-ghost)]">Contents</p>
        <ol className="grid gap-1.5 text-[var(--color-subtext)]">
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#overview">1. Overview</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#plans">2. Plans and Pricing</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#trials">3. Free Trials</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#renewals">4. Subscriptions and Renewals</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#changes">5. Plan Changes</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#cancellation">6. Cancellation</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#failures">7. Payment Failures and Recovery</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#taxes">8. Taxes and Currency</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#refunds">9. Refund Policy</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#disputes">10. Billing Disputes</a></li>
          <li><a className="link-underline hover:text-[var(--color-body)]" href="#contact">11. Contact</a></li>
        </ol>
      </nav>

      <section id="overview">
        <h2>1. Overview</h2>
        <p>This Billing and Refund Policy explains how TrustLoop, Inc. (&quot;TrustLoop&quot;) handles subscription billing, plan changes, payment recovery, and refund requests for Workspace subscriptions. This policy is part of and subject to the <a className="text-[var(--color-signal)] hover:underline" href="/terms">Terms of Service</a>.</p>
        <p>All billing is managed through Dodo Payments, our payment processing partner. TrustLoop does not store full credit card numbers or sensitive payment credentials on its servers.</p>
      </section>

      <section id="plans">
        <h2>2. Plans and Pricing</h2>
        <p>TrustLoop offers the following subscription plans:</p>
        <ul>
          <li><strong>Starter:</strong> Designed for early-stage AI product teams handling customer incidents weekly. Includes core incident management, AI triage, webhook integrations, and standard quotas.</li>
          <li><strong>Pro:</strong> Designed for teams running incident operations daily with tighter approval and reporting needs. Includes all Starter features plus higher quotas, API key access, priority support, and advanced reporting.</li>
          <li><strong>Enterprise:</strong> Custom pricing for organizations requiring SAML SSO, dedicated support, custom SLAs, and tailored onboarding. Contact hello@yashbogam.me for Enterprise terms.</li>
        </ul>
        <p>Both Starter and Pro plans are available with monthly or annual billing. Annual plans are billed upfront for the full year at a discounted rate. Current pricing is displayed on the <Link className="text-[var(--color-signal)] hover:underline" href="/#pricing">pricing page</Link> and within the Workspace billing settings.</p>
        <p>TrustLoop reserves the right to change pricing with at least 30 days&apos; notice. Price changes apply at the next renewal date and do not affect the current billing period.</p>
      </section>

      <section id="trials">
        <h2>3. Free Trials</h2>
        <p>TrustLoop offers a 14-day free trial for the Starter plan. During the trial:</p>
        <ul>
          <li>You have full access to Starter plan features and quotas</li>
          <li>A valid payment method is required to activate the trial for verification purposes</li>
          <li>No charges are made during the trial period</li>
          <li>At the end of the trial, your subscription will automatically convert to a paid Starter plan unless you cancel before the trial expires</li>
        </ul>
        <p>Trial eligibility is limited to one trial per Workspace. TrustLoop reserves the right to modify or discontinue trial offers at any time.</p>
      </section>

      <section id="renewals">
        <h2>4. Subscriptions and Renewals</h2>
        <p>Paid TrustLoop plans renew automatically at the end of each billing period (monthly or annually) until the subscription is canceled. The renewal amount, applicable taxes, billing currency, and any active discount are displayed in your Workspace billing settings before each renewal.</p>
        <p>Renewal charges are processed on the renewal date using the payment method on file. If the renewal date falls on a day that does not exist in a given month (e.g., the 31st), the charge will be processed on the last day of that month.</p>
      </section>

      <section id="changes">
        <h2>5. Plan Changes</h2>
        <h3 className="text-base font-semibold text-[var(--color-body)] mt-4">5.1 Upgrades</h3>
        <p>When you upgrade from Starter to Pro, or switch from monthly to annual billing on the same plan, the change is scheduled to take effect at the start of your next billing period. No additional charge is made immediately — the new plan pricing applies from the next renewal date. Your current plan features and quotas remain active until the change takes effect.</p>
        <h3 className="text-base font-semibold text-[var(--color-body)] mt-4">5.2 Downgrades</h3>
        <p>When you downgrade from Pro to Starter, the change takes effect immediately. Your quotas are reduced to Starter plan levels, and access to Pro-only features is restricted. No prorated refund is issued for the remaining time on the higher plan.</p>
        <h3 className="text-base font-semibold text-[var(--color-body)] mt-4">5.3 Billing Interval Changes</h3>
        <p>Switching between monthly and annual billing on the same plan is treated as a plan change. The new billing interval takes effect at the next renewal date with no immediate charge.</p>
      </section>

      <section id="cancellation">
        <h2>6. Cancellation</h2>
        <p>You may cancel your subscription at any time from the Workspace billing settings. Upon cancellation:</p>
        <ul>
          <li>Your subscription remains active until the end of the current billing period</li>
          <li>No further charges will be made after cancellation</li>
          <li>You retain access to all paid features until the end of the current billing period</li>
          <li>After the billing period ends, your Workspace is downgraded to the Starter plan with reduced quotas</li>
          <li>Your data is preserved and remains accessible on the Starter plan</li>
        </ul>
        <p>No prorated refunds are issued for partial billing periods remaining after cancellation.</p>
      </section>

      <section id="failures">
        <h2>7. Payment Failures and Recovery</h2>
        <p>If a renewal or plan change payment fails, TrustLoop follows this recovery process:</p>
        <ul>
          <li><strong>Immediate:</strong> The payment failure is recorded and the Workspace billing status is updated to &quot;Past Due.&quot; The Workspace retains access to paid features during the recovery window.</li>
          <li><strong>Within 24 hours:</strong> TrustLoop sends a payment failure notification to all Workspace owners and managers with instructions to update the payment method.</li>
          <li><strong>24–48 hours:</strong> A follow-up reminder is sent if the payment issue has not been resolved.</li>
          <li><strong>After 48 hours:</strong> If billing remains unresolved, TrustLoop automatically downgrades the Workspace to the Starter plan and cancels the subscription with the payment provider. A final notification is sent confirming the downgrade.</li>
        </ul>
        <p>To resolve a payment failure, update your payment method in the Workspace billing settings. Once a valid payment method is provided, you can resubscribe to your previous plan.</p>
      </section>

      <section id="taxes">
        <h2>8. Taxes and Currency</h2>
        <p>All prices displayed on the pricing page and in billing settings are exclusive of applicable taxes unless otherwise stated. Taxes (including VAT, GST, and sales tax) are calculated at checkout based on your billing address and are displayed before payment is completed.</p>
        <p>TrustLoop supports multiple billing currencies. The currency is determined at the time of your first payment and remains consistent for subsequent renewals unless you contact support to change it.</p>
        <p>You are responsible for all taxes, duties, and levies imposed by taxing authorities in connection with your subscription, excluding taxes based on TrustLoop&apos;s net income.</p>
      </section>

      <section id="refunds">
        <h2>9. Refund Policy</h2>
        <p>Charges for completed billing periods are generally non-refundable once service access has been provisioned. However, TrustLoop will review refund requests in the following circumstances:</p>
        <ul>
          <li><strong>Duplicate charges:</strong> If you are charged more than once for the same billing period, the duplicate charge will be refunded in full.</li>
          <li><strong>Billing errors:</strong> If a charge is made in error (e.g., incorrect amount, wrong plan), TrustLoop will correct the error and issue a refund for the difference.</li>
          <li><strong>Accidental renewals:</strong> If you intended to cancel before a renewal but were unable to do so due to a Service issue, TrustLoop will review the request and may issue a refund at its discretion.</li>
          <li><strong>Legal requirements:</strong> Refunds required by applicable consumer protection law will be honored regardless of this policy.</li>
        </ul>
        <p>Refund requests must be submitted within 30 days of the charge date. Approved refunds are processed to the original payment method within 5–10 business days.</p>
        <p>The following are not eligible for refunds:</p>
        <ul>
          <li>Partial billing periods remaining after voluntary cancellation</li>
          <li>Downgrades from a higher plan to a lower plan</li>
          <li>Unused quota or features within a billing period</li>
          <li>Charges for billing periods where the Service was available and accessible</li>
        </ul>
      </section>

      <section id="disputes">
        <h2>10. Billing Disputes</h2>
        <p>If you believe a charge is incorrect, contact us as soon as possible with the following information:</p>
        <ul>
          <li>Workspace name and billing email</li>
          <li>Invoice reference or payment date</li>
          <li>Amount in question</li>
          <li>A brief description of the issue</li>
        </ul>
        <p>TrustLoop will investigate the dispute and respond within 5 business days. We will review the charge against our payment provider event logs and billing records. If the dispute is resolved in your favor, a refund or credit will be issued promptly.</p>
        <p>We strongly recommend contacting TrustLoop directly before initiating a chargeback with your bank or payment provider. Chargebacks may result in temporary suspension of your Workspace while the dispute is under review.</p>
      </section>

      <section id="contact">
        <h2>11. Contact</h2>
        <p>For billing questions, refund requests, or payment issues:</p>
        <ul>
          <li>Email: hello@yashbogam.me</li>
          <li>Address: Plot No 25, Hyderabad, 500001, Telangana, India</li>
        </ul>
      </section>
    </LegalShell>
  );
}
