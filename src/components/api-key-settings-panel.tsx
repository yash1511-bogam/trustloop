"use client";

import { useState } from "react";
import { Loader2, KeyRound, X, CheckCircle2, AlertCircle } from "lucide-react";

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

  function showMessage(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(null), 4000);
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

    showMessage(payload?.message ?? "API key created.");
    setRevealedKey(payload?.apiKey ?? null);
    setName("");
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
        <div className={`p-4 text-sm rounded-xl border flex items-center gap-2 ${error ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"}`}>
          {error ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <span>{error || message}</span>
        </div>
      )}

      <div className="pt-2">
        <p className="text-sm font-medium text-slate-100 mb-4">Create new key</p>
        <div className="flex flex-wrap items-center gap-4">
          <input
            className="bg-transparent border-b border-white/20 pb-2 text-slate-100 focus:outline-none focus:border-sky-400 transition-colors flex-1 min-w-[200px] max-w-md placeholder:text-neutral-600"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. CI/CD Pipeline"
            disabled={loading}
          />
          <button 
            className="btn btn-primary" 
            disabled={loading || !name.trim()} 
            onClick={createKey} 
            type="button"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Generate key
          </button>
        </div>
      </div>

      {revealedKey ? (
        <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 animate-in fade-in slide-in-from-top-4">
          <p className="text-sm font-medium text-amber-400 mb-2">One-time key reveal</p>
          <p className="text-xs text-amber-200/70 mb-4">Copy this key now. It will not be shown again.</p>
          <div className="flex items-center gap-4">
            <code className="flex-1 block overflow-x-auto rounded-xl border border-amber-500/30 bg-black/40 p-4 text-sm text-slate-100 font-mono">
              {revealedKey}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(revealedKey)}
              className="btn btn-ghost shrink-0 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
            >
              Copy
            </button>
          </div>
        </div>
      ) : null}

      <div className="pt-4">
        <p className="text-sm tracking-wide text-neutral-500 mb-4 uppercase">Active & Revoked Keys ({keys.length})</p>
        <div className="flex flex-col gap-2">
          {keys.map((key) => (
            <div 
              className={`group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-all ${key.isActive ? "border-transparent hover:border-white/5 hover:bg-white/5" : "border-transparent opacity-50"}`}
              key={key.id}
            >
              <div className="flex items-center gap-4">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center border ${key.isActive ? "bg-white/5 border-white/10 text-slate-300" : "border-dashed border-white/20 text-neutral-600"}`}>
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className={`font-medium ${key.isActive ? "text-slate-200" : "text-neutral-500 line-through"}`}>{key.name}</p>
                    {!key.isActive && <span className="text-[10px] uppercase tracking-wider text-red-400 border border-red-500/20 bg-red-500/10 px-2 py-0.5 rounded-full">Revoked</span>}
                  </div>
                  <p className="text-sm text-neutral-500 font-mono mt-0.5">{key.keyPrefix}••••••••••••</p>
                </div>
              </div>

              <div className="mt-4 sm:mt-0 flex items-center gap-8">
                <div className="flex flex-col items-end">
                  <span className="text-xs text-neutral-400">
                    Created {new Date(key.createdAt).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="text-[10px] text-neutral-500 mt-1">
                    Last used: {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString("en-US") : "Never"}
                  </span>
                </div>

                <div className="w-10 flex justify-end">
                  {key.isActive && (
                    <button
                      className="text-neutral-500 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-400/10 opacity-0 group-hover:opacity-100 focus:opacity-100"
                      disabled={loading}
                      onClick={() => revokeKey(key.id)}
                      type="button"
                      title="Revoke key"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {keys.length === 0 && (
            <div className="p-8 text-center text-sm text-neutral-500 border border-dashed border-white/10 rounded-2xl">
              No API keys created yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
