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
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDate(value: string | null): string {
  return value ? dateFormatter.format(new Date(value)) : "Never";
}

function isExpired(value: string | null): boolean {
  return Boolean(value && new Date(value).getTime() <= Date.now());
}

export function ApiKeySettingsPanel({ initialKeys, turnstileSiteKey }: Props) {
  const turnstileRef = useRef<TurnstileWidgetHandle | null>(null);
  const defaultPreset = getApiKeyUsagePreset(DEFAULT_API_KEY_USAGE_PRESET);
  const [keys, setKeys] = useState(initialKeys);
  const [name, setName] = useState("Monitoring pipeline");
  const [usagePreset, setUsagePreset] = useState<ApiKeyUsagePresetId>(DEFAULT_API_KEY_USAGE_PRESET);
  const [selectedScopes, setSelectedScopes] = useState<ApiKeyScope[]>(
    defaultPreset ? [...defaultPreset.scopes] : [],
  );
  const [expiryOption, setExpiryOption] = useState<ApiKeyExpiryOptionId>(
    DEFAULT_API_KEY_EXPIRY_OPTION,
  );
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const requiresTurnstile = Boolean(turnstileSiteKey);

  const selectedPreset = getApiKeyUsagePreset(usagePreset);
  const selectedExpiry = API_KEY_EXPIRY_OPTIONS.find((option) => option.id === expiryOption) ?? null;

  async function refresh() {
    const response = await fetch("/api/workspace/api-keys");
    if (!response.ok) {
      return;
    }
    const payload = (await response.json()) as { keys: ApiKeyRow[] };
    setKeys(payload.keys);
  }

  function showMessage(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(null), 4000);
  }

  function applyPreset(nextPreset: ApiKeyUsagePresetId) {
    setUsagePreset(nextPreset);
    setSelectedScopes(scopesForApiKeyUsagePreset(nextPreset));
  }

  function toggleScope(scope: ApiKeyScope) {
    setSelectedScopes((current) =>
      current.includes(scope)
        ? current.filter((value) => value !== scope)
        : [...current, scope],
    );
  }

  async function createKey() {
    if (requiresTurnstile && !turnstileToken) {
      setError("Complete the security check before creating an API key.");
      return;
    }

    if (selectedScopes.length === 0) {
      setError("Select at least one permission before creating an API key.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    setRevealedKey(null);

    const response = await fetch("/api/workspace/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        usagePreset,
        scopes: selectedScopes,
        expiryOption,
        turnstileToken,
      }),
    });

    setLoading(false);
    turnstileRef.current?.reset();
    setTurnstileToken(null);

    const payload = (await response.json().catch(() => null)) as
      | { apiKey?: string; message?: string; error?: string }
      | null;

    if (!response.ok) {
      setError(payload?.error ?? "Failed to create API key.");
      return;
    }

    showMessage(payload?.message ?? "API key created.");
    setRevealedKey(payload?.apiKey ?? null);
    setName("");
    if (defaultPreset) {
      setUsagePreset(DEFAULT_API_KEY_USAGE_PRESET);
      setSelectedScopes([...defaultPreset.scopes]);
    }
    setExpiryOption(DEFAULT_API_KEY_EXPIRY_OPTION);
    await refresh();
  }

  async function revokeKey(id: string) {
    setLoading(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/workspace/api-keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    setLoading(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Failed to revoke key.");
      return;
    }

    showMessage("API key revoked.");
    await refresh();
  }

  return (
    <div className="space-y-8">
      {(message || error) && (
        <div
          className={`p-4 text-sm rounded-xl border flex items-center gap-2 ${
            error
              ? "bg-[rgba(232,66,66,0.08)] border-[rgba(232,66,66,0.24)] text-[var(--color-danger)]"
              : "bg-[rgba(22,163,74,0.08)] border-[rgba(22,163,74,0.24)] text-[var(--color-resolve)]"
          }`}
        >
          {error ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <span>{error || message}</span>
        </div>
      )}

      <div className="space-y-6 rounded-3xl border border-[var(--color-rim)] bg-[var(--color-void)] p-6">
        <div>
          <p className="text-sm font-medium text-[var(--color-title)]">Create new key</p>
          <p className="mt-1 text-sm text-[var(--color-ghost)]">
            Choose the permissions this key needs and how long it should stay valid.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-[0.24em] text-[var(--color-ghost)]">
            Key name
          </label>
          <input
            className="w-full max-w-xl rounded-2xl border border-[var(--color-rim)] bg-[var(--color-void)] px-4 py-3 text-[var(--color-title)] outline-none transition focus:border-[var(--color-signal)] placeholder:text-[var(--color-ghost)]"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. CI/CD Pipeline"
            disabled={loading}
          />
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-[var(--color-ghost)]">
              Usage preset
            </p>
            <p className="mt-1 text-sm text-[var(--color-ghost)]">
              Start from a recommended permission set, then adjust the individual scopes below if needed.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {API_KEY_USAGE_PRESETS.map((preset) => {
              const isSelected = preset.id === usagePreset;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  disabled={loading}
                  className={`rounded-2xl border p-4 text-left transition ${
                    isSelected
                      ? "border-[rgba(212, 98, 43,0.28)] bg-[var(--color-signal-dim)] text-[var(--color-title)]"
                      : "border-[var(--color-rim)] bg-[var(--color-void)] text-[var(--color-body)] hover:border-[var(--color-rim)] hover:bg-[var(--color-surface)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">{preset.label}</span>
                    {isSelected ? (
                      <span className="rounded-full border border-[rgba(212, 98, 43,0.28)] bg-[var(--color-signal-dim)] px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-[var(--color-signal)]">
                        Selected
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-[var(--color-subtext)]">{preset.description}</p>
                </button>
              );
            })}
          </div>
          {selectedPreset ? (
            <p className="text-xs text-[var(--color-ghost)]">
              {selectedPreset.label} preset enables {selectedPreset.scopes.length} permission
              {selectedPreset.scopes.length === 1 ? "" : "s"} by default.
            </p>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-[var(--color-ghost)]">
                Permissions
              </p>
              <p className="mt-1 text-sm text-[var(--color-ghost)]">
                These scopes are enforced when the key calls protected API routes.
              </p>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-ghost btn-sm text-xs" onClick={() => setSelectedScopes(API_KEY_ASSIGNABLE_SCOPE_OPTIONS.map(s => s.id))} type="button">Select all</button>
              <button className="btn btn-ghost btn-sm text-xs" onClick={() => setSelectedScopes([])} type="button">Deselect all</button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {API_KEY_ASSIGNABLE_SCOPE_OPTIONS.map((scope) => {
              const checked = selectedScopes.includes(scope.id);
              return (
                <label
                  key={scope.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                    checked
                      ? "border-[rgba(212, 98, 43,0.24)] bg-[var(--color-signal-dim)]"
                      : "border-[var(--color-rim)] bg-[var(--color-void)] hover:border-[var(--color-rim)] hover:bg-[var(--color-surface)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-[var(--color-rim)] bg-transparent text-[var(--color-signal)] focus:ring-[var(--color-signal)]"
                    checked={checked}
                    disabled={loading}
                    onChange={() => toggleScope(scope.id)}
                  />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-title)]">{scope.label}</p>
                    <p className="mt-1 text-sm text-[var(--color-ghost)]">{scope.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[minmax(0,320px)_1fr]">
          <div className="space-y-2">
            <label
              htmlFor="api-key-expiry"
              className="text-xs font-medium uppercase tracking-[0.24em] text-[var(--color-ghost)]"
            >
              Expiry
            </label>
            <select
              id="api-key-expiry"
              className="w-full rounded-2xl border border-[var(--color-rim)] bg-[var(--color-void)] px-4 py-3 text-[var(--color-title)] outline-none transition focus:border-[var(--color-signal)]"
              value={expiryOption}
              onChange={(event) => setExpiryOption(event.target.value as ApiKeyExpiryOptionId)}
              disabled={loading}
            >
              {API_KEY_EXPIRY_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-2xl border border-[var(--color-rim)] bg-[var(--color-void)] p-4">
            <p className="text-sm font-medium text-[var(--color-title)]">
              {selectedExpiry?.label ?? "Custom expiry"}
            </p>
            <p className="mt-2 text-sm text-[var(--color-ghost)]">
              {selectedExpiry?.description ?? "Set how long the key should remain active."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <TurnstileWidget
            ref={turnstileRef}
            siteKey={turnstileSiteKey}
            onTokenChange={setTurnstileToken}
          />
          <button
            className="btn btn-primary"
            disabled={
              loading ||
              !name.trim() ||
              selectedScopes.length === 0 ||
              (requiresTurnstile && !turnstileToken)
            }
            onClick={createKey}
            type="button"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Generate key
          </button>
        </div>
      </div>

      {revealedKey ? (
        <div className="rounded-2xl border border-[rgba(217,119,6,0.24)] bg-[rgba(217,119,6,0.08)] p-6">
          <p className="text-sm font-medium text-[var(--color-warning)] mb-2">One-time key reveal</p>
          <p className="text-xs text-[var(--color-warning)] mb-4">Copy this key now. It will not be shown again.</p>
          <div className="flex items-center gap-4">
            <code className="flex-1 block overflow-x-auto rounded-xl border border-[rgba(217,119,6,0.24)] bg-[var(--color-void)] p-4 text-sm text-[var(--color-title)] font-mono">
              {revealedKey}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(revealedKey)}
              type="button"
              className="btn btn-ghost shrink-0 border-[rgba(217,119,6,0.24)] text-[var(--color-warning)] hover:bg-[rgba(217,119,6,0.12)]"
            >
              Copy
            </button>
          </div>
        </div>
      ) : null}

      <div className="pt-4">
        <p className="text-sm tracking-wide text-[var(--color-ghost)] mb-4 uppercase">
          Active & Revoked Keys ({keys.length})
        </p>
        <div className="flex flex-col gap-3">
          {keys.map((key) => {
            const expired = isExpired(key.expiresAt);
            const scopeSummary = key.scopes
              .map(
                (scope) =>
                  API_KEY_SCOPE_OPTIONS.find((option) => option.id === scope)?.label ??
                  scope,
              )
              .slice(0, 6);

            return (
              <div
                className={`group rounded-2xl border p-4 transition ${
                  key.isActive && !expired
                    ? "border-[var(--color-rim)] bg-[var(--color-surface)] hover:border-[var(--color-rim)]"
                    : "border-[var(--color-rim)] bg-[var(--color-surface)] opacity-70"
                }`}
                key={key.id}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                        key.isActive && !expired
                          ? "border-[var(--color-rim)] bg-[var(--color-surface)] text-[var(--color-body)]"
                          : "border-[var(--color-rim)] bg-[var(--color-surface)] text-[var(--color-ghost)]"
                      }`}
                    >
                      <KeyRound className="h-4 w-4" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={`font-medium ${
                            key.isActive ? "text-[var(--color-body)]" : "text-[var(--color-ghost)] line-through"
                          }`}
                        >
                          {key.name}
                        </p>
                        {!key.isActive ? (
                          <span className="rounded-full border border-[rgba(232,66,66,0.24)] bg-[rgba(232,66,66,0.08)] px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-[var(--color-danger)]">
                            Revoked
                          </span>
                        ) : null}
                        {expired ? (
                          <span className="rounded-full border border-[rgba(217,119,6,0.24)] bg-[rgba(217,119,6,0.08)] px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-[var(--color-warning)]">
                            Expired
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-[var(--color-ghost)] font-mono">{key.keyPrefix}••••••••••••</p>
                      <div className="flex flex-wrap gap-2">
                        {scopeSummary.map((scope) => (
                          <span
                            key={`${key.id}-${scope}`}
                            className="rounded-full border border-[var(--color-rim)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] text-[var(--color-body)]"
                          >
                            {scope}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                    <div className="min-w-[190px] text-sm text-[var(--color-subtext)]">
                      <p>Created {formatDate(key.createdAt)}</p>
                      <p className="mt-1">Last used: {key.lastUsedAt ? formatDate(key.lastUsedAt) : "Never"}</p>
                      <p className="mt-1">
                        {expired ? "Expired" : "Expires"}: {formatDate(key.expiresAt)}
                      </p>
                    </div>

                    <div className="w-10 flex justify-end">
                      {key.isActive ? (
                        <button
                          className="rounded-lg p-2 text-[var(--color-ghost)] transition-colors hover:bg-[rgba(232,66,66,0.08)] hover:text-[var(--color-danger)] lg:opacity-0 lg:group-hover:opacity-100 lg:focus:opacity-100"
                          disabled={loading}
                          onClick={() => revokeKey(key.id)}
                          type="button"
                          title="Revoke key"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {keys.length === 0 ? (
            <div className="rounded-2xl border border-[var(--color-rim)] bg-[var(--color-surface)]">
              <EmptyState
                icon={Key}
                title="No API keys yet."
                description="Create a scoped key when you need external systems to write into TrustLoop."
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
