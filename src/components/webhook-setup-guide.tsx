"use client";

import { useState } from "react";

const guides: Record<string, { name: string; steps: string[] }> = {
  DATADOG: {
    name: "Datadog",
    steps: [
      "Go to Datadog → Integrations → Webhooks.",
      "Create a new webhook with URL: {baseUrl}/api/webhooks/datadog",
      "Set the HMAC secret in TrustLoop Settings → Integrations → Datadog.",
      "Add the webhook as a notification channel in your Datadog monitors.",
    ],
  },
  SENTRY: {
    name: "Sentry",
    steps: [
      "Go to Sentry → Settings → Integrations → Webhooks.",
      "Set the webhook URL to: {baseUrl}/api/webhooks/sentry",
      "Copy the client secret and add it in TrustLoop Settings → Integrations → Sentry.",
      "Enable the issue.created and error.created event types.",
    ],
  },
  PAGERDUTY: {
    name: "PagerDuty",
    steps: [
      "Go to PagerDuty → Integrations → Generic Webhooks V3.",
      "Create a subscription with URL: {baseUrl}/api/webhooks/pagerduty",
      "Add the HMAC signing secret in TrustLoop Settings → Integrations → PagerDuty.",
      "Subscribe to incident.triggered and incident.acknowledged events.",
    ],
  },
  LANGFUSE: {
    name: "Langfuse",
    steps: [
      "Go to Langfuse → Settings → Webhooks.",
      "Add webhook URL: {baseUrl}/api/webhooks/langfuse",
      "Copy the signing secret to TrustLoop Settings → Integrations → Langfuse.",
    ],
  },
  HELICONE: {
    name: "Helicone",
    steps: [
      "Go to Helicone → Settings → Webhooks.",
      "Add webhook URL: {baseUrl}/api/webhooks/helicone",
      "Copy the signing secret to TrustLoop Settings → Integrations → Helicone.",
    ],
  },
  ARIZE_PHOENIX: {
    name: "Arize Phoenix",
    steps: [
      "Go to Arize Phoenix → Alerts → Webhook Destinations.",
      "Add webhook URL: {baseUrl}/api/webhooks/arize-phoenix",
      "Copy the signing secret to TrustLoop Settings → Integrations → Arize Phoenix.",
    ],
  },
  BRAINTRUST: {
    name: "Braintrust",
    steps: [
      "Go to Braintrust → Settings → Webhooks.",
      "Add webhook URL: {baseUrl}/api/webhooks/braintrust",
      "Copy the signing secret to TrustLoop Settings → Integrations → Braintrust.",
    ],
  },
  GENERIC: {
    name: "Generic JSON",
    steps: [
      "POST JSON to: {baseUrl}/api/webhooks/generic",
      "Include x-webhook-secret header matching your configured secret.",
      "Payload should include title, description, and optionally severity (P1-P4).",
    ],
  },
};

export function WebhookSetupGuide() {
  const [selected, setSelected] = useState<string | null>(null);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://your-domain.com";

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-[var(--color-bright)]">Webhook setup guides</h3>
      <div className="flex flex-wrap gap-2">
        {Object.entries(guides).map(([key, guide]) => (
          <button
            key={key}
            onClick={() => setSelected(selected === key ? null : key)}
            className={`btn text-sm ${selected === key ? "btn-primary" : "btn-ghost"}`}
          >
            {guide.name}
          </button>
        ))}
      </div>
      {selected && guides[selected] && (
        <div className="panel-card p-4 space-y-2">
          <h4 className="font-medium text-[var(--color-bright)]">{guides[selected].name} setup</h4>
          <ol className="list-decimal list-inside space-y-1">
            {guides[selected].steps.map((step, i) => (
              <li key={i} className="text-sm text-[var(--color-body)]">
                {step.replace("{baseUrl}", baseUrl)}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
