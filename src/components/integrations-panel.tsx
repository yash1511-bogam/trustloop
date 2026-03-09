"use client";

import { WebhookIntegrationType } from "@prisma/client";
import { useMemo, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, RefreshCcw, Power, PowerOff, ShieldCheck, Copy } from "lucide-react";

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
        <div className={`p-4 text-sm rounded-xl border flex items-center gap-2 ${error ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"}`}>
          {error ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <span className="flex-1">{error || message}</span>
          {message?.includes("New secret:") && (
            <button 
              onClick={() => navigator.clipboard.writeText(message.split("New secret: ")[1])}
              className="p-1.5 hover:bg-emerald-500/20 rounded-lg transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-8">
        {Object.values(WebhookIntegrationType).map((type) => {
          const record = byType.get(type);
          const isActive = record?.isActive ?? false;

          return (
            <article className={`group relative p-6 rounded-2xl border transition-all ${isActive ? "border-white/5 bg-white/5" : "border-white/5 opacity-60 hover:opacity-100"}`} key={type}>
              <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-medium text-slate-100">{type}</h3>
                    <span className={`text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full border ${isActive ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-neutral-500/20 bg-neutral-500/10 text-neutral-500"}`}>
                      {isActive ? "Active" : "Disabled"}
                    </span>
                  </div>
                  {record && (
                    <p className="mt-1 text-xs text-neutral-500">
                      Secret ends in <span className="font-mono text-slate-300">{record.keyLast4}</span> • Updated {new Date(record.updatedAt).toLocaleDateString("en-US")}
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
                    className={`btn !min-h-[32px] !py-1 text-xs ${isActive ? "btn-ghost text-red-400 hover:text-red-300" : "btn-primary"}`}
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
                  <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">Webhook Endpoint</p>
                  <div className="flex items-center gap-3 border-b border-white/10 pb-1.5 group/url">
                    <code className="text-sm text-sky-400 truncate flex-1">{endpoints[type]}</code>
                    <button 
                      onClick={() => navigator.clipboard.writeText(endpoints[type])}
                      className="opacity-0 group-hover/url:opacity-100 transition-opacity text-neutral-500 hover:text-sky-400"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2 items-end">
                  <label className="block space-y-3">
                    <span className="text-xs font-medium text-neutral-500 uppercase tracking-widest">Update secret</span>
                    <input
                      className="w-full bg-transparent border-b border-white/20 pb-2 text-slate-100 focus:outline-none focus:border-sky-400 transition-colors placeholder:text-neutral-600 text-sm"
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

              <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-4">
                <p className="text-[10px] text-neutral-500 uppercase tracking-tight">Required Headers</p>
                <div className="flex flex-wrap gap-2">
                  {['x-trustloop-workspace', 'x-trustloop-signature', 'x-trustloop-timestamp'].map(header => (
                    <code key={header} className="text-[10px] bg-white/5 px-2 py-0.5 rounded border border-white/5 text-neutral-400">{header}</code>
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
