"use client";

import { useState } from "react";

type Usage = {
  incidentsCreated: number;
  triageRuns: number;
  customerUpdates: number;
  reminderEmailsSent: number;
};

type Quota = {
  incidentsPerDay: number;
  triageRunsPerDay: number;
  customerUpdatesPerDay: number;
  reminderEmailsPerDay: number;
};

type BillingState = {
  status: string;
  dodoCustomerId: string | null;
  dodoSubscriptionId: string | null;
  discountCode: string | null;
  lastPaymentAt: string | null;
  lastPaymentAmount: number | null;
  lastPaymentCurrency: string | null;
  paymentFailedAt: string | null;
};

type Props = {
  planTier: string;
  usage: Usage;
  quota: Quota;
  billing: BillingState | null;
};

function percent(used: number, limit: number): number {
  if (limit <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((used / limit) * 100));
}

function formatMoney(amountCents: number | null, currency: string | null): string {
  if (typeof amountCents !== "number") {
    return "N/A";
  }

  const amount = amountCents / 100;
  const code = (currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${code}`;
  }
}

export function BillingPanel({ planTier, usage, quota, billing }: Props) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState(billing?.discountCode ?? "");
  const [error, setError] = useState<string | null>(null);

  let lastPaymentText = "N/A";
  if (billing?.lastPaymentAt) {
    const date = new Date(billing.lastPaymentAt);
    lastPaymentText = Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleString();
  }

  let failedAtText: string | null = null;
  if (billing?.paymentFailedAt) {
    const date = new Date(billing.paymentFailedAt);
    failedAtText = Number.isNaN(date.getTime()) ? null : date.toLocaleString();
  }

  async function startCheckout(plan: "starter" | "pro" | "enterprise") {
    setLoadingPlan(plan);
    setError(null);

    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan,
        couponCode: couponCode.trim() || null,
      }),
    });

    setLoadingPlan(null);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Checkout session failed.");
      return;
    }

    const payload = (await response.json()) as { checkoutUrl?: string };
    if (payload.checkoutUrl) {
      window.location.href = payload.checkoutUrl;
      return;
    }

    setError("Checkout session was created but no redirect URL was returned.");
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-700">
        Current plan: <strong>{planTier}</strong>
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        {[
          {
            label: "Incidents/day",
            used: usage.incidentsCreated,
            limit: quota.incidentsPerDay,
          },
          {
            label: "Triage runs/day",
            used: usage.triageRuns,
            limit: quota.triageRunsPerDay,
          },
          {
            label: "Customer updates/day",
            used: usage.customerUpdates,
            limit: quota.customerUpdatesPerDay,
          },
          {
            label: "Reminder emails/day",
            used: usage.reminderEmailsSent,
            limit: quota.reminderEmailsPerDay,
          },
        ].map((row) => (
          <article className="rounded-xl border border-slate-200 bg-white p-3" key={row.label}>
            <p className="text-sm font-medium">{row.label}</p>
            <p className="mt-1 text-sm text-slate-600">
              {row.used} / {row.limit}
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded bg-slate-100">
              <div
                className="h-full bg-cyan-600"
                style={{ width: `${percent(row.used, row.limit)}%` }}
              />
            </div>
          </article>
        ))}
      </div>

      <label className="space-y-1 text-sm md:max-w-md">
        <span className="font-medium">Coupon code (optional)</span>
        <input
          className="input"
          value={couponCode}
          onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
          placeholder="SAVE20"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          className="btn btn-ghost"
          disabled={Boolean(loadingPlan)}
          onClick={() => startCheckout("starter")}
          type="button"
        >
          {loadingPlan === "starter" ? "Opening..." : "Switch to Starter"}
        </button>
        <button
          className="btn btn-primary"
          disabled={Boolean(loadingPlan)}
          onClick={() => startCheckout("pro")}
          type="button"
        >
          {loadingPlan === "pro" ? "Opening..." : "Switch to Pro"}
        </button>
        <button
          className="btn btn-ghost"
          disabled={Boolean(loadingPlan)}
          onClick={() => startCheckout("enterprise")}
          type="button"
        >
          {loadingPlan === "enterprise" ? "Opening..." : "Switch to Enterprise"}
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
        <p>
          Billing provider: <strong>Dodo Payments</strong>
        </p>
        <p>
          Subscription status: <strong>{billing?.status ?? "NONE"}</strong>
        </p>
        <p>
          Customer ID: <strong>{billing?.dodoCustomerId ?? "Not linked"}</strong>
        </p>
        <p>
          Subscription ID: <strong>{billing?.dodoSubscriptionId ?? "Not linked"}</strong>
        </p>
        <p>
          Last payment: <strong>{lastPaymentText}</strong> ({formatMoney(
            billing?.lastPaymentAmount ?? null,
            billing?.lastPaymentCurrency ?? null,
          )})
        </p>
        {failedAtText ? (
          <p>
            Payment failure detected at: <strong>{failedAtText}</strong>. Reminder emails and auto-cancel at 48h are enabled.
          </p>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
