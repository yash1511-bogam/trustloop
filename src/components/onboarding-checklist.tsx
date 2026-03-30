"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CheckCircle,
  Plug,
  Robot,
  Siren,
  SlackLogo,
  X,
} from "@phosphor-icons/react";

type OnboardingProps = {
  onboarding: {
    dismissed: boolean;
    hasIncident: boolean;
    hasTriaged: boolean;
    hasAiKey: boolean;
    hasSlack: boolean;
    hasWebhook: boolean;
  };
};

const steps = [
  { id: "hasIncident", label: "Create your first incident", desc: "Log an incident manually or route one in from a webhook.", href: "/incidents", icon: Siren },
  { id: "hasTriaged", label: "Run AI triage", desc: "Let the system propose severity, owner, and safe next steps.", href: "/incidents", icon: Robot },
  { id: "hasAiKey", label: "Add an AI provider key", desc: "Connect OpenAI, Gemini, or Anthropic before the next incident lands.", href: "/integrations/ai", icon: Robot },
  { id: "hasSlack", label: "Connect Slack", desc: "Keep responders aligned with alerting and approved status updates.", href: "/integrations/webhooks", icon: SlackLogo },
  { id: "hasWebhook", label: "Set up a webhook integration", desc: "Accept incidents from Datadog, Sentry, PagerDuty, or custom sources.", href: "/integrations/webhooks", icon: Plug },
] as const;

export function OnboardingChecklist({ onboarding }: OnboardingProps) {
  const [dismissed, setDismissed] = useState(onboarding.dismissed);

  const doneCount = steps.filter((s) => onboarding[s.id]).length;
  const allDone = doneCount === steps.length;

  if (dismissed || allDone) return null;

  async function handleDismiss() {
    setDismissed(true);
    await fetch("/api/onboarding/dismiss", { method: "POST" }).catch(() => null);
  }

  return (
    <div className="surface section-enter p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="section-heading">
          <p className="page-kicker">Onboarding</p>
          <h2 className="section-title">Operational readiness checklist</h2>
          <p className="section-description">
            Complete the essentials before your first customer-facing AI incident hits the queue.
          </p>
          <div className="mt-1 h-1.5 w-48 rounded-full bg-[var(--color-rim)]">
            <div
              className="h-full rounded-full bg-[var(--color-signal)]"
              style={{ width: `${(doneCount / steps.length) * 100}%`, transition: "width var(--duration-slow) var(--ease-out)" }}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="badge badge-info">{doneCount}/{steps.length} complete</div>
          <button className="btn btn-ghost btn-sm" onClick={handleDismiss} title="You can re-access this from Settings" type="button">
            <X size={14} weight="regular" />
            Dismiss
          </button>
        </div>
      </div>

      <ul className="mt-5 grid gap-3 lg:grid-cols-2 xl:grid-cols-5">
        {steps.map((step) => {
          const done = onboarding[step.id];
          return (
            <li key={step.id}>
              <Link
                className="surface-clickable flex h-full items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-rim)] bg-[var(--color-void)] p-4"
                href={step.href}
              >
                {done ? (
                  <CheckCircle color="var(--color-resolve)" size={18} weight="duotone" />
                ) : (
                  <step.icon color="var(--color-subtext)" size={18} weight="duotone" />
                )}
                <div className="grid gap-1">
                  <p className={`text-sm ${done ? "text-[var(--color-ghost)] line-through" : "text-[var(--color-body)]"}`}>{step.label}</p>
                  <p className="text-xs text-[var(--color-subtext)]">{step.desc}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
