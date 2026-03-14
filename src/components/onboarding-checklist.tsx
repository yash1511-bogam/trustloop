"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Circle, ChevronDown, ChevronUp } from "lucide-react";

type ChecklistItem = {
  id: string;
  label: string;
  description: string;
  href: string;
  check: () => Promise<boolean>;
};

const STORAGE_KEY = "trustloop_onboarding_dismissed";

const items: ChecklistItem[] = [
  {
    id: "create_incident",
    label: "Create your first incident",
    description: "Log an incident manually or via webhook.",
    href: "/dashboard",
    check: async () => {
      const res = await fetch("/api/incidents?limit=1");
      const data = await res.json();
      return (data.incidents?.length ?? 0) > 0;
    },
  },
  {
    id: "run_triage",
    label: "Run AI triage",
    description: "Let AI classify severity and suggest next steps.",
    href: "/dashboard",
    check: async () => {
      const res = await fetch("/api/incidents?limit=10");
      const data = await res.json();
      return data.incidents?.some((i: { triagedAt: string | null }) => i.triagedAt) ?? false;
    },
  },
  {
    id: "configure_ai",
    label: "Add an AI provider key",
    description: "Configure OpenAI, Gemini, or Anthropic in Settings.",
    href: "/settings/ai",
    check: async () => {
      const res = await fetch("/api/settings/ai-keys");
      const data = await res.json();
      return (data.keys?.length ?? 0) > 0;
    },
  },
  {
    id: "connect_slack",
    label: "Connect Slack",
    description: "Get incident alerts in your Slack workspace.",
    href: "/settings/workspace",
    check: async () => false, // Checked server-side via workspace.slackTeamId
  },
  {
    id: "add_webhook",
    label: "Set up a webhook integration",
    description: "Connect Datadog, Sentry, PagerDuty, or others.",
    href: "/settings/workspace",
    check: async () => false,
  },
];

export function OnboardingChecklist() {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState(false);
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
          if (done) setCompleted((prev) => ({ ...prev, [item.id]: true }));
        }).catch(() => {});
    });
  }, [dismissed]);

  if (dismissed) return null;

  const doneCount = Object.values(completed).filter(Boolean).length;
  const allDone = doneCount === items.length;

  return (
    <div className="surface mb-6 rounded-xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">
            Getting Started {doneCount}/{items.length}
          </h3>
          <div className="mt-1 h-1.5 w-40 rounded-full bg-neutral-800">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${(doneCount / items.length) * 100}%` }}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCollapsed(!collapsed)} className="text-neutral-500 hover:text-neutral-300">
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <button
            onClick={() => { setDismissed(true); localStorage.setItem(STORAGE_KEY, "1"); }}
            className="text-xs text-neutral-500 hover:text-neutral-300"
          >
            Dismiss
          </button>
        </div>
      </div>

      {!collapsed && (
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-start gap-3 rounded-lg p-2 hover:bg-neutral-800/50"
              >
                {completed[item.id] ? (
                  <Check className="mt-0.5 h-4 w-4 text-green-500" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 text-neutral-600" />
                )}
                <div>
                  <p className={`text-sm ${completed[item.id] ? "text-neutral-500 line-through" : "text-slate-200"}`}>
                    {item.label}
                  </p>
                  <p className="text-xs text-neutral-500">{item.description}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {allDone && !collapsed && (
        <p className="mt-3 text-center text-sm text-green-400">
          🎉 All done! You&apos;re ready to go.
        </p>
      )}
    </div>
  );
}
