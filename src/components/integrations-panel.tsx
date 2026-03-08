"use client";

import { WebhookIntegrationType } from "@prisma/client";
import { useMemo, useState } from "react";

type Integration = {
  type: WebhookIntegrationType;
  isActive: boolean;
  keyLast4: string;
  updatedAt: string;
};

type EndpointMap = Record<WebhookIntegrationType, string>;

type Props = {
  initialIntegrations: Integration[];
  endpoints: EndpointMap;
};

export function IntegrationsPanel({ initialIntegrations, endpoints }: Props) {
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [secretInputs, setSecretInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const byType = useMemo(() => {
    const map = new Map<WebhookIntegrationType, Integration>();
    for (const integration of integrations) {
      map.set(integration.type, integration);
    }
    return map;
  }, [integrations]);

  async function refresh() {
    const response = await fetch("/api/settings/integrations");
    if (!response.ok) {
      return;
    }
    const payload = (await response.json()) as { integrations: Integration[] };
    setIntegrations(payload.integrations);
  }

  async function saveSecret(type: WebhookIntegrationType) {
    setLoading(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/settings/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        secret: (secretInputs[type] ?? "").trim(),
        isActive: true,
      }),
    });

    setLoading(false);

    const payload = (await response.json().catch(() => null)) as
      | { message?: string; error?: string }
      | null;

    if (!response.ok) {
      setError(payload?.error ?? "Failed to save integration secret.");
      return;
    }

    setMessage(payload?.message ?? `${type} secret updated.`);
    setSecretInputs((prev) => ({ ...prev, [type]: "" }));
    await refresh();
  }

  async function rotateSecret(type: WebhookIntegrationType) {
    setLoading(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/settings/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        rotate: true,
        isActive: true,
      }),
    });

    setLoading(false);

    const payload = (await response.json().catch(() => null)) as
      | { secret?: string | null; message?: string; error?: string }
      | null;

    if (!response.ok) {
      setError(payload?.error ?? "Failed to rotate secret.");
      return;
    }

    setMessage(
      payload?.secret
        ? `${payload.message ?? "Secret rotated."} New secret: ${payload.secret}`
        : payload?.message ?? "Secret rotated.",
    );
    await refresh();
  }

  async function toggle(type: WebhookIntegrationType, isActive: boolean) {
    setLoading(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/settings/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, isActive }),
    });

    setLoading(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Failed to update integration state.");
      return;
    }

    setMessage(`${type} ${isActive ? "enabled" : "disabled"}.`);
    await refresh();
  }

  return (
    <div className="space-y-4">
      {Object.values(WebhookIntegrationType).map((type) => {
        const record = byType.get(type);
        return (
          <article className="panel-card p-4" key={type}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{type}</h3>
              <span className="text-xs text-neutral-500">
                {record
                  ? `Secret ending ${record.keyLast4} • ${record.isActive ? "Active" : "Disabled"}`
                  : "Not configured"}
              </span>
            </div>

            <p className="mb-2 text-xs text-neutral-400">
              Endpoint: <code>{endpoints[type]}</code>
            </p>
            <p className="mb-2 text-xs text-neutral-400">
              Send headers: <code>x-trustloop-workspace</code>,{" "}
              <code>x-trustloop-signature</code>, <code>x-trustloop-timestamp</code>
            </p>

            <div className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto]">
              <input
                className="input"
                placeholder={`Set ${type} secret`}
                value={secretInputs[type] ?? ""}
                onChange={(event) =>
                  setSecretInputs((prev) => ({ ...prev, [type]: event.target.value }))
                }
              />
              <button
                className="btn btn-primary"
                disabled={loading}
                onClick={() => saveSecret(type)}
                type="button"
              >
                Save
              </button>
              <button
                className="btn btn-ghost"
                disabled={loading}
                onClick={() => rotateSecret(type)}
                type="button"
              >
                Rotate
              </button>
              <button
                className="btn btn-ghost"
                disabled={loading}
                onClick={() => toggle(type, !(record?.isActive ?? false))}
                type="button"
              >
                {record?.isActive ? "Disable" : "Enable"}
              </button>
            </div>
          </article>
        );
      })}

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
