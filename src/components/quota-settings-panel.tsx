"use client";

import { useState } from "react";

type Quota = {
  apiRequestsPerMinute: number;
  incidentsPerDay: number;
  triageRunsPerDay: number;
  customerUpdatesPerDay: number;
  reminderEmailsPerDay: number;
};

type Props = {
  initialQuota: Quota;
};

export function QuotaSettingsPanel({ initialQuota }: Props) {
  const [quota, setQuota] = useState<Quota>(initialQuota);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setLoading(true);
    setMessage(null);
    setError(null);

    const response = await fetch("/api/settings/quotas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quota),
    });

    setLoading(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Failed to save quota settings.");
      return;
    }

    setMessage("Workspace quota settings saved.");
  }

  function updateField(field: keyof Quota, value: string) {
    const parsed = Number(value);
    setQuota((prev) => ({
      ...prev,
      [field]: Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0,
    }));
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-700">
        Configure tenant-aware limits for API traffic and daily workflow quotas.
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">API requests / minute</span>
          <input
            className="input"
            type="number"
            min={10}
            max={5000}
            value={quota.apiRequestsPerMinute}
            onChange={(event) => updateField("apiRequestsPerMinute", event.target.value)}
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium">Incidents / day</span>
          <input
            className="input"
            type="number"
            min={10}
            max={100000}
            value={quota.incidentsPerDay}
            onChange={(event) => updateField("incidentsPerDay", event.target.value)}
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium">AI triage runs / day</span>
          <input
            className="input"
            type="number"
            min={10}
            max={100000}
            value={quota.triageRunsPerDay}
            onChange={(event) => updateField("triageRunsPerDay", event.target.value)}
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium">Customer update drafts / day</span>
          <input
            className="input"
            type="number"
            min={10}
            max={100000}
            value={quota.customerUpdatesPerDay}
            onChange={(event) => updateField("customerUpdatesPerDay", event.target.value)}
          />
        </label>

        <label className="space-y-1 text-sm md:col-span-2">
          <span className="font-medium">Reminder emails / day</span>
          <input
            className="input"
            type="number"
            min={10}
            max={100000}
            value={quota.reminderEmailsPerDay}
            onChange={(event) => updateField("reminderEmailsPerDay", event.target.value)}
          />
        </label>
      </div>

      <button className="btn btn-primary" disabled={loading} onClick={save} type="button">
        {loading ? "Saving..." : "Save quota settings"}
      </button>

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
