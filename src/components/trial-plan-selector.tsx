"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Check } from "@/components/icon-compat";

export function TrialPlanSelector() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const features = [
    "50 incidents/day",
    "100 AI triage runs/day",
    "BYOK provider keys",
    "Email reminders",
    "Public status page",
    "Webhook integrations",
  ];

  async function startTrial() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/billing/start-trial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "starter" }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Failed to start trial.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="text-center mb-12">
        <p className="page-kicker mb-3">Get started</p>
        <h1 className="font-[var(--font-heading)] text-[32px] font-bold text-[var(--color-title)]">Start your 14-day free trial</h1>
        <p className="mt-3 text-sm text-[var(--color-ghost)] max-w-md mx-auto">
          Full access to the Starter plan. No credit card required. Upgrade anytime.
        </p>
      </div>

      <div className="max-w-sm w-full">
        <div className="p-6 rounded-2xl border border-[var(--color-signal)] bg-[rgba(212,98,43,0.06)] ring-1 ring-[rgba(212,98,43,0.24)]">
          <p className="text-lg font-semibold text-[var(--color-title)]">Starter</p>
          <p className="mt-1">
            <span className="text-2xl font-light text-[var(--color-title)]">$49</span>
            <span className="text-sm text-[var(--color-ghost)]">/mo after trial</span>
          </p>
          <ul className="mt-4 space-y-2">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-[var(--color-subtext)]">
                <Check className="h-3.5 w-3.5 text-[var(--color-signal)] shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {error && <p className="mt-6 text-sm text-[var(--color-danger)]">{error}</p>}

      <button type="button" disabled={loading} onClick={startTrial} className="btn btn-primary mt-10 px-10 py-3 text-base">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start 14-day Starter trial"}
      </button>

      <p className="mt-4 text-xs text-[var(--color-ghost)]">
        You won&apos;t be charged during the trial. Subscribe before it ends to keep your plan.
      </p>
    </div>
  );
}
