"use client";

import { WebhookIntegrationType } from "@prisma/client";
import { useMemo, useState } from "react";
import { PlugsConnected } from "@phosphor-icons/react";
import { EmptyState } from "@/components/empty-state";
import { Loader2, CheckCircle2, AlertCircle, RefreshCcw, Power, PowerOff, ShieldCheck, Copy } from "@/components/icon-compat";

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
    setTimeout(() => setMessage(null), 3000);
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
    setTimeout(() => setMessage(null), 3000);
  }

  return (
    <div className="space-y-12 max-w-4xl">
      {(message || error) && (
        <div className={`p-4 text-sm rounded-xl border flex items-center gap-2 ${error ? "bg-[rgba(232,66,66,0.08)] border-[rgba(232,66,66,0.24)] text-[var(--color-danger)]" : "bg-[rgba(22,163,74,0.08)] border-[rgba(22,163,74,0.24)] text-[var(--color-resolve)]"}`}>
          {error ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <span className="flex-1">{error || message}</span>
          {message?.includes("New secret:") && (
            <button 
              onClick={() => navigator.clipboard.writeText(message.split("New secret: ")[1])}
              className="rounded-lg p-1.5 transition-colors hover:bg-[var(--color-signal-dim)]"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {integrations.length === 0 ? (
        <div className="rounded-2xl border border-[var(--color-rim)] bg-[var(--color-surface)]">
          <EmptyState
            icon={PlugsConnected}
            title="No integrations connected."
            description="Inbound endpoints are ready. Add a signing secret to activate monitoring sources."
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-8">
        {Object.values(WebhookIntegrationType).map((type) => {
          const record = byType.get(type);
          const isActive = record?.isActive ?? false;

          return (
            <article className={`group relative p-6 rounded-2xl border transition-all ${isActive ? "border-[var(--color-rim)] bg-[var(--color-surface)]" : "border-[var(--color-rim)] opacity-60 hover:opacity-100"}`} key={type}>
              <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-medium text-[var(--color-title)]">{type}</h3>
                    <span className={`text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full border ${isActive ? "border-[rgba(22,163,74,0.24)] bg-[rgba(22,163,74,0.08)] text-[var(--color-resolve)]" : "border-[var(--color-rim)] bg-[var(--color-void)] text-[var(--color-ghost)]"}`}>
                      {isActive ? "Active" : "Disabled"}
                    </span>
                  </div>
                  {record && (
                    <p className="mt-1 text-xs text-[var(--color-ghost)]">
                      Secret ends in <span className="font-mono text-[var(--color-body)]">{record.keyLast4}</span> • Updated {new Date(record.updatedAt).toLocaleDateString("en-US")}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <button
                    className="btn btn-ghost !min-h-[32px] !py-1 text-xs"
                    disabled={loading}
                    onClick={() => rotateSecret(type)}
                    type="button"
                  >
                    <RefreshCcw className="w-3 h-3" /> Rotate
                  </button>
                  <button
                    className={`btn !min-h-[32px] !py-1 text-xs ${isActive ? "btn-danger" : "btn-primary"}`}
                    disabled={loading}
                    onClick={() => toggle(type, !isActive)}
                    type="button"
                  >
                    {isActive ? <PowerOff className="w-3 h-3" /> : <Power className="w-3 h-3" />}
                    {isActive ? "Disable" : "Enable"}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-[var(--color-ghost)] font-medium">Webhook Endpoint</p>
                  <div className="flex items-center gap-3 border-b border-[var(--color-rim)] pb-1.5 group/url">
                    <code className="text-sm text-[var(--color-signal)] truncate flex-1">{endpoints[type]}</code>
                    <button 
                      onClick={() => navigator.clipboard.writeText(endpoints[type])}
                      className="opacity-0 group-hover/url:opacity-100 transition-opacity text-[var(--color-ghost)] hover:text-[var(--color-signal)]"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2 items-end">
                  <label className="block space-y-3">
                    <span className="text-xs font-medium text-[var(--color-ghost)] uppercase tracking-widest">Update secret</span>
                    <input
                      className="w-full bg-transparent border-b border-[var(--color-rim)] pb-2 text-[var(--color-title)] focus:outline-none focus:border-[var(--color-signal)] transition-colors placeholder:text-[var(--color-ghost)] text-sm"
                      placeholder={`Enter new ${type} secret`}
                      value={secretInputs[type] ?? ""}
                      onChange={(event) =>
                        setSecretInputs((prev) => ({ ...prev, [type]: event.target.value }))
                      }
                      disabled={loading}
                    />
                  </label>
                  <button
                    className="btn btn-primary w-fit"
                    disabled={loading || !secretInputs[type]}
                    onClick={() => saveSecret(type)}
                    type="button"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    Update secret
                  </button>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[var(--color-rim)] flex items-center gap-4">
                <p className="text-[10px] text-[var(--color-ghost)] uppercase tracking-tight">Required Headers</p>
                <div className="flex flex-wrap gap-2">
                  {['x-trustloop-workspace', 'x-trustloop-signature', 'x-trustloop-timestamp'].map(header => (
                    <code key={header} className="text-[10px] bg-[var(--color-surface)] px-2 py-0.5 rounded border border-[var(--color-rim)] text-[var(--color-subtext)]">{header}</code>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
