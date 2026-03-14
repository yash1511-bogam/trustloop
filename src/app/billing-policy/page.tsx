import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Billing Policy",
  description:
    "TrustLoop billing, renewal, payment recovery, and refund handling policy for workspace subscriptions.",
  alternates: {
    canonical: "/billing-policy",
  },
};

export default function BillingPolicyPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-16 md:px-10">
      <section className="surface p-8">
        <p className="kicker">TrustLoop policy</p>
        <h1 className="mt-3 text-4xl font-semibold text-slate-100">Billing and refund policy</h1>
        <p className="mt-4 max-w-3xl text-sm text-neutral-400">
          This page explains how TrustLoop handles subscription renewals, plan changes, payment recovery,
          and refund review for workspace billing.
        </p>
      </section>

      <section className="surface space-y-8 p-8 text-sm leading-7 text-neutral-300">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Subscriptions and renewals</h2>
          <p className="mt-3">
            Paid TrustLoop plans renew automatically until the subscription is canceled. The amount due,
            taxes, billing currency, and any discount applied are shown before payment is completed.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-slate-100">Plan changes</h2>
          <p className="mt-3">
            When you change plans, TrustLoop creates a fresh secure checkout session and applies the new
            plan after payment confirmation from the billing provider. If a payment does not complete,
            the workspace remains on its current billing state until a successful confirmation is received.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-slate-100">Payment failures and recovery</h2>
          <p className="mt-3">
            If a renewal or plan-change payment fails, TrustLoop records the failure, sends reminder
            notifications to workspace billing contacts, and keeps a recovery window open so the payment
            issue can be resolved.
          </p>
          <p className="mt-3">
            If billing remains unresolved through the recovery window, TrustLoop may automatically downgrade
            the workspace to the Starter plan to keep access aligned with the last successfully paid state.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-slate-100">Refund review</h2>
          <p className="mt-3">
            Charges for completed billing periods are generally non-refundable once service access has been
            provisioned, except where a refund is required by law. Duplicate charges, obvious billing
            mistakes, or accidental renewals are reviewed case-by-case.
          </p>
          <p className="mt-3">
            For the fastest review, gather the workspace name, invoice reference, payment date, and a short
            explanation of the issue before contacting your TrustLoop billing contact.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-slate-100">Questions about a charge</h2>
          <p className="mt-3">
            If something looks wrong, contact the billing or onboarding contact associated with your TrustLoop
            workspace as soon as possible so the payment record can be reviewed against the provider event log.
          </p>
        </div>
      </section>
    </main>
  );
}
