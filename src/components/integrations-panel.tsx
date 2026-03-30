"use client";

import { WebhookIntegrationType } from "@prisma/client";
import { useMemo, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, RefreshCcw, ShieldCheck, Copy } from "@/components/icon-compat";
import { CaretDown } from "@phosphor-icons/react";
import { integrationLogos } from "@/components/integration-logos";

type Integration = { type: WebhookIntegrationType; isActive: boolean; keyLast4: string; updatedAt: string };
type EndpointMap = Record<WebhookIntegrationType, string>;
type Props = { initialIntegrations: Integration[]; endpoints: EndpointMap };

const meta: Record<WebhookIntegrationType, { label: string; logo: string; color: string; desc: string }> = {
  DATADOG: { label: "Datadog", logo: "Datadog", color: "#632CA6", desc: "Forward monitors and alerts into TrustLoop incidents." },
  PAGERDUTY: { label: "PagerDuty", logo: "PagerDuty", color: "#06AC38", desc: "Route PagerDuty on-call events to your incident queue." },
  SENTRY: { label: "Sentry", logo: "Sentry", color: "#FB4226", desc: "Capture Sentry issue alerts as AI incidents." },
  GENERIC: { label: "Custom Webhook", logo: "Custom Webhooks", color: "#6366f1", desc: "Accept signed payloads from any source." },
  LANGFUSE: { label: "Langfuse", logo: "Langfuse", color: "#8b5cf6", desc: "Ingest LLM observability events from Langfuse." },
  HELICONE: { label: "Helicone", logo: "Helicone", color: "#06b6d4", desc: "Stream Helicone request logs into incidents." },
  ARIZE_PHOENIX: { label: "Arize Phoenix", logo: "Arize Phoenix", color: "#f97316", desc: "Connect Arize Phoenix model monitoring." },
  BRAINTRUST: { label: "Braintrust", logo: "Braintrust", color: "#eab308", desc: "Pipe Braintrust eval failures into your queue." },
};

export function IntegrationsPanel({ initialIntegrations, endpoints }: Props) {
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [secretInputs, setSecretInputs] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const byType = useMemo(() => {
    const m = new Map<WebhookIntegrationType, Integration>();
    for (const i of integrations) m.set(i.type, i);
    return m;
  }, [integrations]);

  async function refresh() {
    const r = await fetch("/api/settings/integrations");
    if (r.ok) { const d = (await r.json()) as { integrations: Integration[] }; setIntegrations(d.integrations); }
  }
  function flash(msg: string) { setMessage(msg); setTimeout(() => setMessage(null), 3000); }

  async function saveSecret(type: WebhookIntegrationType) {
    setLoading(type); setError(null); setMessage(null);
    const r = await fetch("/api/settings/integrations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, secret: (secretInputs[type] ?? "").trim(), isActive: true }) });
    setLoading(null);
    const p = (await r.json().catch(() => null)) as { message?: string; error?: string } | null;
    if (!r.ok) { setError(p?.error ?? "Failed."); return; }
    flash(p?.message ?? `${meta[type].label} saved.`);
    setSecretInputs((prev) => ({ ...prev, [type]: "" })); await refresh();
  }
  async function rotateSecret(type: WebhookIntegrationType) {
    setLoading(type); setError(null); setMessage(null);
    const r = await fetch("/api/settings/integrations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, rotate: true, isActive: true }) });
    setLoading(null);
    const p = (await r.json().catch(() => null)) as { secret?: string | null; message?: string; error?: string } | null;
    if (!r.ok) { setError(p?.error ?? "Failed."); return; }
    flash(p?.message ?? "Rotated."); await refresh();
  }
  async function toggle(type: WebhookIntegrationType, isActive: boolean) {
    setLoading(type); setError(null); setMessage(null);
    const r = await fetch("/api/settings/integrations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, isActive }) });
    setLoading(null);
    if (!r.ok) { const p = (await r.json().catch(() => null)) as { error?: string } | null; setError(p?.error ?? "Failed."); return; }
    flash(`${meta[type].label} ${isActive ? "enabled" : "disabled"}.`); await refresh();
  }
  function copyUrl(type: string, url: string) {
    navigator.clipboard.writeText(url); setCopied(type); setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div>
      {(message || error) && (
        <div className={`mb-4 p-3 text-sm rounded-xl border flex items-center gap-2 ${error ? "bg-[rgba(232,66,66,0.08)] border-[rgba(232,66,66,0.24)] text-[var(--color-danger)]" : "bg-[rgba(22,163,74,0.08)] border-[rgba(22,163,74,0.24)] text-[var(--color-resolve)]"}`}>
          {error ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
          <span className="flex-1">{error || message}</span>
        </div>
      )}

      <div className="divide-y divide-[var(--color-rim)] border border-[var(--color-rim)] rounded-xl overflow-hidden">
        {Object.values(WebhookIntegrationType).map((type) => {
          const record = byType.get(type);
          const isActive = record?.isActive ?? false;
          const m = meta[type];
          const isOpen = open === type;
          const busy = loading === type;

          return (
            <div key={type}>
              {/* Row */}
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : type)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isOpen ? "bg-[var(--color-surface)]" : "hover:bg-[var(--color-surface)]"}`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `${m.color}12`, color: m.color }}>
                  {integrationLogos[m.logo]}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-[var(--color-title)]">{m.label}</span>
                  <p className="text-[11px] text-[var(--color-ghost)] truncate">{m.desc}</p>
                </div>
                {record && (
                  <span className="text-[10px] font-mono text-[var(--color-ghost)] hidden sm:block">••••{record.keyLast4}</span>
                )}
                <div className={`h-2 w-2 rounded-full shrink-0 ${isActive ? "bg-[var(--color-resolve)]" : "bg-[var(--color-ghost)] opacity-30"}`} />
                <CaretDown size={14} weight="bold" className={`text-[var(--color-ghost)] shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Dropdown */}
              <div className="grid transition-[grid-template-rows] duration-200 ease-out" style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}>
                <div className="overflow-hidden">
                  <div className="bg-[var(--color-void)] px-4 pb-4 pt-2 border-t border-[var(--color-rim)] space-y-3">
                  {/* Endpoint */}
                  <div className="flex items-center gap-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-rim)] px-3 py-2">
                    <span className="text-[10px] text-[var(--color-ghost)] shrink-0 uppercase tracking-wider font-medium">URL</span>
                    <code className="text-[11px] text-[var(--color-signal)] truncate flex-1">{endpoints[type]}</code>
                    <button onClick={(e) => { e.stopPropagation(); copyUrl(type, endpoints[type]); }} className="shrink-0 p-0.5 rounded text-[var(--color-ghost)] hover:text-[var(--color-signal)] transition-colors" type="button">
                      {copied === type ? <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-resolve)]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Secret input */}
                  <div className="flex gap-2">
                    <input
                      className="input flex-1 !text-sm"
                      placeholder={record ? "Enter new signing secret…" : "Paste signing secret to activate"}
                      value={secretInputs[type] ?? ""}
                      onChange={(e) => setSecretInputs((prev) => ({ ...prev, [type]: e.target.value }))}
                      onClick={(e) => e.stopPropagation()}
                      disabled={!!loading}
                    />
                    <button className="btn btn-primary !min-h-[36px] text-xs" disabled={busy || !secretInputs[type]} onClick={(e) => { e.stopPropagation(); saveSecret(type); }} type="button">
                      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                      Save
                    </button>
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center gap-2">
                    {record && (
                      <button className="btn btn-ghost !min-h-[30px] text-[11px]" disabled={busy} onClick={(e) => { e.stopPropagation(); rotateSecret(type); }} type="button">
                        <RefreshCcw className="w-3 h-3" /> Rotate secret
                      </button>
                    )}
                    <button
                      className={`btn !min-h-[30px] text-[11px] ${isActive ? "btn-danger" : "btn-primary"}`}
                      disabled={busy}
                      onClick={(e) => { e.stopPropagation(); toggle(type, !isActive); }}
                      type="button"
                    >
                      {isActive ? "Disable" : "Enable"}
                    </button>
                    <div className="flex-1" />
                    {record && (
                      <span className="text-[10px] text-[var(--color-ghost)]">Updated {new Date(record.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    )}
                  </div>
                </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
