"use client";

import { useRef, useState } from "react";
import { Key } from "@phosphor-icons/react";
import { EmptyState } from "@/components/empty-state";
import { Loader2, KeyRound, X, CheckCircle2, AlertCircle } from "@/components/icon-compat";
import {
  API_KEY_ASSIGNABLE_SCOPE_OPTIONS,
  API_KEY_EXPIRY_OPTIONS,
  API_KEY_SCOPE_OPTIONS,
  API_KEY_USAGE_PRESETS,
  DEFAULT_API_KEY_EXPIRY_OPTION,
  DEFAULT_API_KEY_USAGE_PRESET,
  getApiKeyUsagePreset,
  scopesForApiKeyUsagePreset,
  type ApiKeyExpiryOptionId,
  type ApiKeyScope,
  type ApiKeyUsagePresetId,
} from "@/lib/api-key-scopes";
import {
  TurnstileWidget,
  type TurnstileWidgetHandle,
} from "@/components/turnstile-widget";

type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: ApiKeyScope[];
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
};

type Props = {
  initialKeys: ApiKeyRow[];
  turnstileSiteKey?: string | null;
  disabled?: boolean;
};

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
function fmtDate(v: string | null) { return v ? dateFmt.format(new Date(v)) : "Never"; }
function isExpired(v: string | null) { return Boolean(v && new Date(v).getTime() <= Date.now()); }

export function ApiKeySettingsPanel({ initialKeys, turnstileSiteKey, disabled }: Props) {
  const turnstileRef = useRef<TurnstileWidgetHandle | null>(null);
  const defaultPreset = getApiKeyUsagePreset(DEFAULT_API_KEY_USAGE_PRESET);
  const [keys, setKeys] = useState(initialKeys);
  const [name, setName] = useState("Monitoring pipeline");
  const [usagePreset, setUsagePreset] = useState<ApiKeyUsagePresetId>(DEFAULT_API_KEY_USAGE_PRESET);
  const [selectedScopes, setSelectedScopes] = useState<ApiKeyScope[]>(defaultPreset ? [...defaultPreset.scopes] : []);
  const [expiryOption, setExpiryOption] = useState<ApiKeyExpiryOptionId>(DEFAULT_API_KEY_EXPIRY_OPTION);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const requiresTurnstile = Boolean(turnstileSiteKey);
  const selectedExpiry = API_KEY_EXPIRY_OPTIONS.find((o) => o.id === expiryOption) ?? null;

  async function refresh() {
    const r = await fetch("/api/workspace/api-keys");
    if (r.ok) { const p = (await r.json()) as { keys: ApiKeyRow[] }; setKeys(p.keys); }
  }
  function flash(msg: string) { setMessage(msg); setTimeout(() => setMessage(null), 4000); }
  function applyPreset(id: ApiKeyUsagePresetId) { setUsagePreset(id); setSelectedScopes(scopesForApiKeyUsagePreset(id)); }
  function toggleScope(scope: ApiKeyScope) { setSelectedScopes((c) => c.includes(scope) ? c.filter((s) => s !== scope) : [...c, scope]); }

  async function createKey() {
    if (requiresTurnstile && !turnstileToken) { setError("Complete the security check first."); return; }
    if (selectedScopes.length === 0) { setError("Select at least one permission."); return; }
    setLoading(true); setError(null); setMessage(null); setRevealedKey(null);
    const r = await fetch("/api/workspace/api-keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, usagePreset, scopes: selectedScopes, expiryOption, turnstileToken }) });
    setLoading(false); turnstileRef.current?.reset(); setTurnstileToken(null);
    const p = (await r.json().catch(() => null)) as { apiKey?: string; message?: string; error?: string } | null;
    if (!r.ok) { setError(p?.error ?? "Failed to create API key."); return; }
    flash(p?.message ?? "API key created."); setRevealedKey(p?.apiKey ?? null); setName("");
    if (defaultPreset) { setUsagePreset(DEFAULT_API_KEY_USAGE_PRESET); setSelectedScopes([...defaultPreset.scopes]); }
    setExpiryOption(DEFAULT_API_KEY_EXPIRY_OPTION); await refresh();
  }

  async function revokeKey(id: string) {
    setLoading(true); setError(null); setMessage(null);
    const r = await fetch("/api/workspace/api-keys", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setLoading(false);
    if (!r.ok) { const p = (await r.json().catch(() => null)) as { error?: string } | null; setError(p?.error ?? "Failed to revoke."); return; }
    flash("API key revoked."); await refresh();
  }

  return (
    <div className={`space-y-10 ${disabled ? "opacity-50 pointer-events-none select-none" : ""}`}>
      {/* Toast */}
      {(message || error) && (
        <div className={`p-3 text-sm rounded-lg border flex items-center gap-2 ${error ? "bg-[rgba(232,66,66,0.08)] border-[rgba(232,66,66,0.24)] text-[var(--color-danger)]" : "bg-[rgba(22,163,74,0.08)] border-[rgba(22,163,74,0.24)] text-[var(--color-resolve)]"}`}>
          {error ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
          <span className="flex-1">{error || message}</span>
        </div>
      )}

      {/* Revealed key */}
      {revealedKey && (
        <div className="rounded-xl border border-[rgba(217,119,6,0.24)] bg-[rgba(217,119,6,0.06)] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[var(--color-warning)]" />
            <span className="text-sm font-medium text-[var(--color-warning)]">Copy your key now — it won&apos;t be shown again</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-[var(--color-void)] border border-[var(--color-rim)] px-3 py-2.5">
            <code className="flex-1 text-sm font-mono text-[var(--color-title)] truncate">{revealedKey}</code>
            <button onClick={() => navigator.clipboard.writeText(revealedKey)} className="btn btn-ghost !min-h-[28px] text-xs text-[var(--color-warning)]" type="button">Copy</button>
          </div>
        </div>
      )}

      {/* ── Create form ── */}
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-title)]">Create new key</h3>
          <p className="text-xs text-[var(--color-ghost)] mt-1">Choose permissions and expiry for this key.</p>
        </div>

        {/* Name + Expiry row */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium uppercase tracking-widest text-[var(--color-ghost)]">Key name</label>
            <input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CI/CD Pipeline" disabled={loading} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium uppercase tracking-widest text-[var(--color-ghost)]">Expiry</label>
            <select className="input w-full" value={expiryOption} onChange={(e) => setExpiryOption(e.target.value as ApiKeyExpiryOptionId)} disabled={loading}>
              {API_KEY_EXPIRY_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            {selectedExpiry && <p className="text-[10px] text-[var(--color-ghost)]">{selectedExpiry.description}</p>}
          </div>
        </div>

        {/* Presets */}
        <div className="space-y-2">
          <label className="text-[10px] font-medium uppercase tracking-widest text-[var(--color-ghost)]">Usage preset</label>
          <div className="flex flex-wrap gap-2">
            {API_KEY_USAGE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                disabled={loading}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${p.id === usagePreset ? "border-[var(--color-signal)] bg-[var(--color-signal-dim)] text-[var(--color-signal)]" : "border-[var(--color-rim)] text-[var(--color-subtext)] hover:bg-[var(--color-surface)]"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scopes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-medium uppercase tracking-widest text-[var(--color-ghost)]">Permissions</label>
            <div className="flex gap-2">
              <button className="text-[10px] text-[var(--color-ghost)] hover:text-[var(--color-body)] transition-colors" onClick={() => setSelectedScopes(API_KEY_ASSIGNABLE_SCOPE_OPTIONS.map(s => s.id))} type="button">All</button>
              <span className="text-[10px] text-[var(--color-rim)]">·</span>
              <button className="text-[10px] text-[var(--color-ghost)] hover:text-[var(--color-body)] transition-colors" onClick={() => setSelectedScopes([])} type="button">None</button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {API_KEY_ASSIGNABLE_SCOPE_OPTIONS.map((scope) => {
              const on = selectedScopes.includes(scope.id);
              return (
                <label key={scope.id} className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${on ? "border-[var(--color-signal)] bg-[var(--color-signal-dim)]" : "border-[var(--color-rim)] hover:bg-[var(--color-surface)]"}`}>
                  <input type="checkbox" className="mt-0.5 h-3.5 w-3.5 rounded border-[var(--color-rim)] bg-transparent text-[var(--color-signal)] focus:ring-[var(--color-signal)]" checked={on} disabled={loading} onChange={() => toggleScope(scope.id)} />
                  <div>
                    <p className="text-xs font-medium text-[var(--color-title)] leading-tight">{scope.label}</p>
                    <p className="text-[10px] text-[var(--color-ghost)] mt-0.5 leading-snug">{scope.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Generate */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[var(--color-rim)]">
          <TurnstileWidget ref={turnstileRef} siteKey={turnstileSiteKey} onTokenChange={setTurnstileToken} />
          <button className="btn btn-primary" disabled={loading || !name.trim() || selectedScopes.length === 0 || (requiresTurnstile && !turnstileToken)} onClick={createKey} type="button">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Generate key
          </button>
          <span className="text-[10px] text-[var(--color-ghost)]">{selectedScopes.length} permission{selectedScopes.length !== 1 ? "s" : ""} selected</span>
        </div>
      </div>

      {/* ── Key list ── */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-medium uppercase tracking-widest text-[var(--color-ghost)]">Active & revoked keys ({keys.length})</h3>

        {keys.length === 0 ? (
          <div className="rounded-xl border border-[var(--color-rim)]">
            <EmptyState icon={Key} title="No API keys yet." description="Create a scoped key when you need external systems to write into TrustLoop." />
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-rim)] border border-[var(--color-rim)] rounded-xl overflow-hidden">
            {keys.map((k) => {
              const expired = isExpired(k.expiresAt);
              const dead = !k.isActive || expired;
              const scopes = k.scopes.map((s) => API_KEY_SCOPE_OPTIONS.find((o) => o.id === s)?.label ?? s).slice(0, 4);

              return (
                <div key={k.id} className={`group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-[var(--color-surface)] ${dead ? "opacity-50" : ""}`}>
                  {/* Icon */}
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${dead ? "bg-[var(--color-surface)] text-[var(--color-ghost)]" : "bg-[var(--color-signal-dim)] text-[var(--color-signal)]"}`}>
                    <KeyRound className="h-3.5 w-3.5" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${k.isActive ? "text-[var(--color-title)]" : "text-[var(--color-ghost)] line-through"}`}>{k.name}</span>
                      {!k.isActive && <span className="text-[9px] uppercase tracking-widest font-bold text-[var(--color-danger)]">Revoked</span>}
                      {expired && <span className="text-[9px] uppercase tracking-widest font-bold text-[var(--color-warning)]">Expired</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px] font-mono text-[var(--color-ghost)]">{k.keyPrefix}••••••</span>
                      <span className="text-[10px] text-[var(--color-ghost)]">Created {fmtDate(k.createdAt)}</span>
                      <span className="text-[10px] text-[var(--color-ghost)]">Used {k.lastUsedAt ? fmtDate(k.lastUsedAt) : "never"}</span>
                    </div>
                  </div>

                  {/* Scopes */}
                  <div className="hidden lg:flex flex-wrap gap-1 max-w-[240px]">
                    {scopes.map((s) => (
                      <span key={`${k.id}-${s}`} className="text-[9px] px-1.5 py-0.5 rounded border border-[var(--color-rim)] text-[var(--color-ghost)]">{s}</span>
                    ))}
                    {k.scopes.length > 4 && <span className="text-[9px] text-[var(--color-ghost)]">+{k.scopes.length - 4}</span>}
                  </div>

                  {/* Revoke */}
                  <div className="w-8 flex justify-end">
                    {k.isActive && (
                      <button className="p-1.5 rounded-md text-[var(--color-ghost)] hover:text-[var(--color-danger)] hover:bg-[rgba(232,66,66,0.08)] transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100" disabled={loading} onClick={() => revokeKey(k.id)} type="button" title="Revoke">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
