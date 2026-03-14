"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Check } from "lucide-react";

type PlanTier = "starter" | "pro" | "enterprise";

const plans: { id: PlanTier; name: string; price: string; period: string; features: string[]; popular?: boolean }[] = [
  {
    id: "starter",
    name: "Starter",
    price: "$49",
    period: "/mo",
    features: [
      "50 incidents/day",
      "100 AI triage runs/day",
      "BYOK provider keys",
      "Email reminders",
      "Public status page",
      "Webhook integrations",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$149",
    period: "/mo",
    popular: true,
    features: [
      "200 incidents/day",
      "300 AI triage runs/day",
      "Compliance mode",
      "On-call rotation",
      "Incident PDF export",
      "Workspace API keys",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    features: [
      "Unlimited quotas",
      "SAML SSO",
      "Everything in Pro",
      "Dedicated onboarding",
      "Private networking",
    ],
  },
];

export function TrialPlanSelector() {
  const router = useRouter();
  const [selected, setSelected] = useState<PlanTier>("pro");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startTrial() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/billing/start-trial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: selected }),
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
        <p className="text-[10px] uppercase tracking-widest text-sky-400 font-medium mb-3">Choose your plan</p>
        <h1 className="text-3xl font-semibold text-slate-100">Start your 14-day free trial</h1>
        <p className="mt-3 text-sm text-neutral-500 max-w-md mx-auto">
          Full access to your chosen plan. No credit card required. Cancel anytime.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 max-w-4xl w-full">
        {plans.map((plan) => (
          <button
            key={plan.id}
            type="button"
            disabled={loading}
            onClick={() => setSelected(plan.id)}
            className={`relative text-left p-6 rounded-2xl border transition-all ${
              selected === plan.id
                ? "border-sky-500 bg-sky-500/5 ring-1 ring-sky-500/30"
                : "border-white/10 bg-white/[0.02] hover:border-white/20"
            }`}
          >
            {plan.popular && (
              <span className="absolute -top-3 left-6 text-[10px] uppercase tracking-widest bg-sky-500 text-white px-3 py-1 rounded-full font-medium">
                Most popular
              </span>
            )}
            <p className="text-lg font-semibold text-slate-100">{plan.name}</p>
            <p className="mt-1">
              <span className="text-2xl font-light text-slate-100">{plan.price}</span>
              <span className="text-sm text-neutral-500">{plan.period}</span>
            </p>
            <ul className="mt-4 space-y-2">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-neutral-400">
                  <Check className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-6 text-sm text-red-400">{error}</p>
      )}

      <button
        type="button"
        disabled={loading}
        onClick={startTrial}
        className="btn btn-primary mt-10 px-10 py-3 text-base"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Start 14-day ${plans.find((p) => p.id === selected)?.name} trial`}
      </button>

      <p className="mt-4 text-xs text-neutral-500">
        You won&apos;t be charged during the trial. Subscribe before it ends to keep your plan.
      </p>
    </div>
  );
}
