"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";

const plans = [
  {
    name: "Starter",
    monthly: 49,
    annual: 39,
    description: "For smaller teams that need dependable incident coordination.",
    cta: "Start 14-day trial",
    ctaHref: "/register",
    highlighted: false,
    limits: ["50 incidents/day", "100 triage runs/day", "Unlimited members", "Email support"],
    features: { aiKeys: true, webhooks: true, apiKeys: false, compliance: false, saml: false, onCall: false, postMortems: true, statusPage: true, slackIntegration: true },
  },
  {
    name: "Pro",
    monthly: 149,
    annual: 119,
    description: "Balanced limits for teams running incident ops daily.",
    cta: "Start 14-day trial",
    ctaHref: "/register",
    highlighted: true,
    limits: ["200 incidents/day", "300 triage runs/day", "Unlimited members", "Priority support"],
    features: { aiKeys: true, webhooks: true, apiKeys: true, compliance: true, saml: false, onCall: true, postMortems: true, statusPage: true, slackIntegration: true },
  },
  {
    name: "Enterprise",
    monthly: 0,
    annual: 0,
    description: "For large or regulated teams needing high throughput and access controls.",
    cta: "Contact Sales",
    ctaHref: "mailto:sales@trustloop.dev",
    highlighted: false,
    limits: ["Unlimited incidents", "Unlimited triage", "Unlimited members", "Dedicated support + SLA"],
    features: { aiKeys: true, webhooks: true, apiKeys: true, compliance: true, saml: true, onCall: true, postMortems: true, statusPage: true, slackIntegration: true },
  },
];

const featureLabels: Record<string, string> = {
  aiKeys: "BYOK AI Provider Keys",
  webhooks: "Webhook Integrations",
  apiKeys: "API Keys",
  compliance: "Compliance Export",
  saml: "SAML SSO",
  onCall: "On-Call Rotation",
  postMortems: "AI Post-Mortems",
  statusPage: "Public Status Page",
  slackIntegration: "Slack Integration",
};

function formatPrice(plan: typeof plans[number], annual: boolean): string {
  if (plan.monthly === 0) return "Custom";
  return annual ? `$${plan.annual}` : `$${plan.monthly}`;
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <main className="mx-auto max-w-5xl px-6 py-20">
      <div className="mb-16 text-center">
        <h1 className="text-4xl font-bold text-slate-100">Simple, transparent pricing</h1>
        <p className="mt-4 text-lg text-neutral-400">Every plan starts with a 14-day free trial. No credit card required.</p>

        <div className="mt-6 inline-flex items-center gap-3 rounded-full bg-neutral-800 p-1">
          <button
            onClick={() => setAnnual(false)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${!annual ? "bg-blue-600 text-white" : "text-neutral-400 hover:text-neutral-200"}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${annual ? "bg-blue-600 text-white" : "text-neutral-400 hover:text-neutral-200"}`}
          >
            Annual <span className="text-xs text-green-400">Save 20%</span>
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`surface flex flex-col rounded-xl p-6 ${plan.highlighted ? "ring-2 ring-blue-500" : ""}`}
          >
            {plan.highlighted && (
              <span className="mb-3 inline-block w-fit rounded-full bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-400">
                Most Popular
              </span>
            )}
            <h3 className="text-xl font-semibold text-slate-100">{plan.name}</h3>
            <div className="mt-2">
              <span className="text-3xl font-bold text-slate-100">{formatPrice(plan, annual)}</span>
              {plan.monthly > 0 && <span className="text-neutral-500">/month</span>}
              {annual && plan.monthly > 0 && (
                <span className="ml-2 text-sm text-neutral-500 line-through">${plan.monthly}</span>
              )}
            </div>
            {annual && plan.monthly > 0 && (
              <p className="mt-1 text-xs text-green-400">Billed ${plan.annual * 12}/year</p>
            )}
            <p className="mt-3 text-sm text-neutral-400">{plan.description}</p>

            <Link
              href={plan.ctaHref}
              className={`mt-6 block rounded-lg px-4 py-2.5 text-center text-sm font-medium ${
                plan.highlighted
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-neutral-800 text-slate-200 hover:bg-neutral-700"
              }`}
            >
              {plan.cta}
            </Link>

            <ul className="mt-6 space-y-2 text-sm">
              {plan.limits.map((limit) => (
                <li key={limit} className="flex items-center gap-2 text-neutral-300">
                  <Check className="h-4 w-4 text-green-500" />
                  {limit}
                </li>
              ))}
            </ul>

            <div className="mt-6 border-t border-neutral-800 pt-4">
              <p className="mb-2 text-xs font-medium uppercase text-neutral-500">Features</p>
              <ul className="space-y-1.5 text-sm">
                {Object.entries(plan.features).map(([key, enabled]) => (
                  <li key={key} className="flex items-center gap-2">
                    {enabled ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-neutral-600" />
                    )}
                    <span className={enabled ? "text-neutral-300" : "text-neutral-600"}>
                      {featureLabels[key]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
