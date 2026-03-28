"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CheckCircle,
  Plug,
  Robot,
  Siren,
  SlackLogo,
  X,
} from "@phosphor-icons/react";

type ChecklistItem = {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: typeof Siren;
  check: () => Promise<boolean>;
};

const STORAGE_KEY = "trustloop_onboarding_dismissed";

const items: ChecklistItem[] = [
  {
    id: "create_incident",
    label: "Create your first incident",
    description: "Log an incident manually or route one in from a webhook.",
    href: "/dashboard",
    icon: Siren,
    check: async () => {
      const res = await fetch("/api/incidents?limit=1");
      const data = await res.json();
      return (data.incidents?.length ?? 0) > 0;
    },
  },
  {
    id: "run_triage",
    label: "Run AI triage",
    description: "Let the system propose severity, owner, and safe next steps.",
    href: "/dashboard",
    icon: Robot,
    check: async () => {
      const res = await fetch("/api/incidents?limit=10");
      const data = await res.json();
      return data.incidents?.some((incident: { triagedAt: string | null }) => incident.triagedAt) ?? false;
    },
  },
  {
    id: "configure_ai",
    label: "Add an AI provider key",
    description: "Connect OpenAI, Gemini, or Anthropic before the next incident lands.",
    href: "/settings/ai",
    icon: Robot,
    check: async () => {
      const res = await fetch("/api/settings/ai-keys");
      const data = await res.json();
      return (data.keys?.length ?? 0) > 0;
    },
  },
  {
    id: "connect_slack",
    label: "Connect Slack",
    description: "Keep responders aligned with alerting and approved status updates.",
    href: "/settings/workspace",
    icon: SlackLogo,
    check: async () => false,
  },
  {
    id: "add_webhook",
    label: "Set up a webhook integration",
    description: "Accept incidents from Datadog, Sentry, PagerDuty, or custom sources.",
    href: "/settings/workspace",
    icon: Plug,
    check: async () => false,
  },
];

export function OnboardingChecklist() {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return Boolean(window.localStorage.getItem(STORAGE_KEY));
  });

  useEffect(() => {
    if (dismissed) {
      return;
    }

    items.forEach((item) => {
      item.check().then((done) => {
        if (done) {
          setCompleted((prev) => ({ ...prev, [item.id]: true }));
        }
      }).catch(() => null);
    });
  }, [dismissed]);

  if (dismissed) {
    return null;
  }

  const doneCount = Object.values(completed).filter(Boolean).length;
  const allDone = doneCount === items.length;

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
              style={{
                width: `${(doneCount / items.length) * 100}%`,
                transition: `width var(--duration-slow) var(--ease-out)`,
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="badge badge-info">
            {doneCount}/{items.length} complete
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setDismissed(true);
              localStorage.setItem(STORAGE_KEY, "1");
            }}
            title="You can re-access this from Settings"
            type="button"
          >
            <X size={14} weight="regular" />
            Dismiss
          </button>
        </div>
      </div>

      <ul className="mt-5 grid gap-3 lg:grid-cols-2 xl:grid-cols-5">
        {items.map((item) => {
          const complete = Boolean(completed[item.id]);

          return (
            <li key={item.id}>
              <Link
                className="surface-clickable flex h-full items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-rim)] bg-[var(--color-void)] p-4"
                href={item.href}
              >
                {complete ? (
                  <CheckCircle color="var(--color-resolve)" size={18} weight="duotone" />
                ) : (
                  <item.icon color="var(--color-subtext)" size={18} weight="duotone" />
                )}
                <div className="grid gap-1">
                  <p className={`text-sm ${complete ? "text-[var(--color-ghost)] line-through" : "text-[var(--color-body)]"}`}>
                    {item.label}
                  </p>
                  <p className="text-xs text-[var(--color-subtext)]">{item.description}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {allDone ? (
        <p className="mt-4 text-sm text-[var(--color-resolve)]">
          All clear. Your workspace is ready for live incident response.
        </p>
      ) : null}
    </div>
  );
}
