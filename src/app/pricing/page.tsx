"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, X } from "@phosphor-icons/react";

const plans: Array<{
  name: string;
  monthly: number | null;
  annual: number | null;
  description: string;
  highlighted: boolean;
  cta: string;
  href: string;
  features: Array<[string, boolean]>;
}> = [
  {
    name: "Starter",
    monthly: 49,
    annual: 39,
    description: "For smaller teams that need dependable incident coordination.",
    highlighted: false,
    cta: "Start 14-day trial",
    href: "/register",
    features: [
      ["50 incidents/day", true],
      ["100 triage runs/day", true],
      ["Webhook integrations", true],
      ["API keys", false],
      ["SAML SSO", false],
    ],
  },
  {
    name: "Pro",
    monthly: 149,
    annual: 119,
    description: "Balanced limits for teams running incident ops daily.",
    highlighted: true,
    cta: "Start 14-day trial",
    href: "/register",
    features: [
      ["200 incidents/day", true],
      ["300 triage runs/day", true],
      ["API keys", true],
      ["On-call rotation", true],
      ["SAML SSO", false],
    ],
  },
  {
    name: "Enterprise",
    monthly: null,
    annual: null,
    description: "For large or regulated teams needing higher throughput and access controls.",
    highlighted: false,
    cta: "Contact sales",
    href: "mailto:hello@trustloop.dev",
    features: [
      ["Unlimited incidents", true],
      ["Unlimited triage", true],
      ["API keys", true],
      ["On-call rotation", true],
      ["SAML SSO", true],
    ],
  },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <main className="page-shell page-stack">
      <section className="marketing-section !pt-12 text-center">
        <p className="page-kicker">Pricing</p>
        <h1 className="font-[var(--font-heading)] text-[40px] font-bold text-[var(--color-title)]">
          Plans for AI incident operations teams.
        </h1>
        <p className="mx-auto mt-5 max-w-[520px] text-[16px] leading-7 text-[var(--color-subtext)]">
          Every plan starts with a 14-day trial. Shift from scattered response work to one operational system.
        </p>

        <div className="mt-6 inline-flex items-center gap-1 rounded-full border border-[var(--color-rim)] bg-[var(--color-surface)] p-1.5">
          <button className={annual ? "btn btn-ghost" : "btn btn-primary"} onClick={() => setAnnual(false)} type="button">
            Monthly
          </button>
          <button className={annual ? "btn btn-primary" : "btn btn-ghost"} onClick={() => setAnnual(true)} type="button">
            Annual
            <span className="ml-1 rounded-full bg-[var(--color-signal-dim)] px-2 py-0.5 text-[11px] text-[var(--color-signal)]">save 20%</span>
          </button>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => (
          <article
            className={`relative rounded-[var(--radius-xl)] border p-6 ${plan.highlighted ? "bg-[var(--color-raised)] border-[var(--color-signal)] shadow-[0_0_0_1px_var(--color-signal)]" : plan.monthly === null ? "bg-gradient-to-b from-[var(--color-raised)] to-[var(--color-surface)] border-[var(--color-muted)]" : "bg-[var(--color-surface)] border-[var(--color-rim)]"}`}
            key={plan.name}
          >
            {plan.highlighted ? (
              <span className="absolute left-6 top-[-12px] badge badge-info bg-[var(--color-signal-dim)] text-[var(--color-signal)] border-transparent">
                Most Popular
              </span>
            ) : null}
            <h2 className="font-[var(--font-heading)] text-[16px] font-extrabold text-[var(--color-title)]">{plan.name}</h2>
            <div className="mt-4 flex items-end gap-2">
              <span className="font-[var(--font-heading)] text-[48px] font-extrabold text-[var(--color-bright)]">
                {plan.monthly === null ? "Custom" : `$${annual ? plan.annual : plan.monthly}`}
              </span>
              <span className="pb-2 text-[16px] text-[var(--color-subtext)]">
                {plan.monthly === null ? "" : "/mo"}
              </span>
            </div>
            <p className="mt-4 max-w-[240px] text-[14px] leading-6 text-[var(--color-subtext)]">{plan.description}</p>
            <div className="mt-6 h-px bg-[var(--color-rim)]" />
            <ul className="mt-6 grid gap-3 text-[14px] text-[var(--color-body)]">
              {plan.features.map(([feature, enabled]) => (
                <li className="flex items-center gap-2" key={feature}>
                  {enabled ? (
                    <Check color="var(--color-signal)" size={16} weight="regular" />
                  ) : (
                    <X color="var(--color-ghost)" size={16} weight="regular" />
                  )}
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Link className={`mt-8 inline-flex w-full justify-center ${plan.highlighted ? "btn btn-primary" : "btn btn-ghost"}`} href={plan.href}>
              {plan.cta}
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
