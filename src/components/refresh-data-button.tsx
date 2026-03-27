"use client";

import { useState } from "react";
import { Loader2, RefreshCcw } from "@/components/icon-compat";

export function RefreshDataButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/refresh-read-models", { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Failed to refresh data.");
        return;
      }
      window.location.reload();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        className="btn btn-primary text-xs !min-h-[32px] px-4"
        disabled={loading}
        onClick={refresh}
        type="button"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
        {loading ? "Refreshing…" : "Refresh data"}
      </button>
      {error && <span className="text-xs text-[var(--color-danger)]">{error}</span>}
    </div>
  );
}
