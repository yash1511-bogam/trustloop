"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck } from "@/components/icon-compat";

type Props = {
  samlEnabled: boolean;
  samlMetadataUrl: string | null;
  samlOrganizationId: string | null;
  samlConnectionId: string | null;
  disabled?: boolean;
};

export function SamlSsoPanel({ samlEnabled, samlMetadataUrl, samlOrganizationId, samlConnectionId, disabled }: Props) {
  const [enabled, setEnabled] = useState(samlEnabled);
  const [metadataUrl, setMetadataUrl] = useState(samlMetadataUrl ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasChanges = enabled !== samlEnabled || metadataUrl !== (samlMetadataUrl ?? "");
  const isConfigured = samlEnabled && samlMetadataUrl && samlConnectionId;

  async function save() {
    setLoading(true); setMessage(null); setError(null);
    const r = await fetch("/api/settings/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ samlEnabled: enabled, samlMetadataUrl: metadataUrl }),
    });
    setLoading(false);
    if (!r.ok) {
      const p = (await r.json().catch(() => null)) as { error?: string } | null;
      setError(p?.error ?? "Failed to save SAML settings.");
      return;
    }
    setMessage("SAML settings saved."); setTimeout(() => setMessage(null), 3000);
  }

  return (
    <div className={`space-y-6 ${disabled ? "opacity-50 pointer-events-none select-none" : ""}`}>
      {(message || error) && (
        <div className={`p-3 text-sm rounded-lg border flex items-center gap-2 ${error ? "bg-[rgba(232,66,66,0.08)] border-[rgba(232,66,66,0.24)] text-[var(--color-danger)]" : "bg-[rgba(22,163,74,0.08)] border-[rgba(22,163,74,0.24)] text-[var(--color-resolve)]"}`}>
          {error ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
          <span>{error || message}</span>
        </div>
      )}

      {/* Status */}
      <div className="flex items-center gap-3">
        <div className={`h-2.5 w-2.5 rounded-full ${isConfigured ? "bg-[var(--color-resolve)]" : "bg-[var(--color-ghost)] opacity-40"}`} />
        <span className="text-sm font-medium text-[var(--color-title)]">{isConfigured ? "SAML SSO is active" : "SAML SSO is not configured"}</span>
      </div>

      {/* Fields */}
      <div className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium uppercase tracking-widest text-[var(--color-ghost)]">IdP metadata URL</label>
          <input
            className="input w-full"
            value={metadataUrl}
            onChange={(e) => setMetadataUrl(e.target.value)}
            placeholder="https://idp.example.com/app/metadata"
            disabled={loading}
          />
          <p className="text-[10px] text-[var(--color-ghost)]">The SAML 2.0 metadata endpoint from your identity provider (Okta, Azure AD, OneLogin, etc.)</p>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-[var(--color-rim)] bg-transparent text-[var(--color-signal)] focus:ring-[var(--color-signal)]"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            disabled={loading}
          />
          <span className="text-sm text-[var(--color-body)]">Enable SAML SSO for this workspace</span>
        </label>

        {enabled && !metadataUrl && (
          <div className="flex items-start gap-2 rounded-lg border border-[rgba(217,119,6,0.24)] bg-[rgba(217,119,6,0.06)] p-3 text-xs text-[var(--color-warning)]">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <p>Provide a metadata URL before enabling SSO. Without it, SAML authentication will not work.</p>
          </div>
        )}
      </div>

      {/* Read-only info */}
      <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t border-[var(--color-rim)]">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-[var(--color-ghost)] font-medium">Organization ID</p>
          <p className="text-sm font-mono text-[var(--color-subtext)]">{samlOrganizationId ?? "—"}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-[var(--color-ghost)] font-medium">Connection ID</p>
          <p className="text-sm font-mono text-[var(--color-subtext)]">{samlConnectionId ?? "—"}</p>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center justify-between pt-4 border-t border-[var(--color-rim)]">
        <p className="text-xs text-[var(--color-ghost)]">{hasChanges ? "You have unsaved changes." : "Settings are up to date."}</p>
        <button className="btn btn-primary" disabled={loading || !hasChanges} onClick={save} type="button">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save SAML settings"}
        </button>
      </div>
    </div>
  );
}
