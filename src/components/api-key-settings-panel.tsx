"use client";

import { useState } from "react";

type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string | null;
};

type Props = {
  initialKeys: ApiKeyRow[];
};

export function ApiKeySettingsPanel({ initialKeys }: Props) {
  const [keys, setKeys] = useState(initialKeys);
  const [name, setName] = useState("Monitoring pipeline");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch("/api/workspace/api-keys");
    if (!response.ok) {
      return;
    }
    const payload = (await response.json()) as { keys: ApiKeyRow[] };
    setKeys(payload.keys);
  }

  async function createKey() {
    setLoading(true);
    setError(null);
    setMessage(null);
    setRevealedKey(null);

    const response = await fetch("/api/workspace/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    setLoading(false);

    const payload = (await response.json().catch(() => null)) as
      | { apiKey?: string; message?: string; error?: string }
      | null;

    if (!response.ok) {
      setError(payload?.error ?? "Failed to create API key.");
      return;
    }

    setMessage(payload?.message ?? "API key created.");
    setRevealedKey(payload?.apiKey ?? null);
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

    setMessage("API key revoked.");
    await refresh();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-700">
        Create API keys for external incident intake (monitoring alerts, bot automations, and webhook pipelines).
      </p>

      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Key name"
        />
        <button className="btn btn-primary" disabled={loading} onClick={createKey} type="button">
          {loading ? "Creating..." : "Create API key"}
        </button>
      </div>

      {revealedKey ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="kicker mb-1">One-time key reveal</p>
          <code className="block overflow-x-auto rounded bg-white p-2 text-xs">{revealedKey}</code>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[740px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Prefix</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Last used</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => (
              <tr className="border-t border-slate-100" key={key.id}>
                <td className="px-3 py-2">{key.name}</td>
                <td className="px-3 py-2 font-mono text-xs">{key.keyPrefix}</td>
                <td className="px-3 py-2">{new Date(key.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2">
                  {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : "Never"}
                </td>
                <td className="px-3 py-2">{key.isActive ? "Active" : "Revoked"}</td>
                <td className="px-3 py-2">
                  {key.isActive ? (
                    <button
                      className="btn btn-ghost"
                      disabled={loading}
                      onClick={() => revokeKey(key.id)}
                      type="button"
                    >
                      Revoke
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
            {keys.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-slate-500" colSpan={6}>
                  No API keys created yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
