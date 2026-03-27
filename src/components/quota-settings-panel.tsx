"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, RefreshCcw } from "@/components/icon-compat";
import { UpgradeGate } from "@/components/upgrade-gate";
import { isFeatureAllowed } from "@/lib/feature-gate";

type Quota = {
  apiRequestsPerMinute: number;
  incidentsPerDay: number;
  triageRunsPerDay: number;
  customerUpdatesPerDay: number;
  reminderEmailsPerDay: number;
  reminderIntervalHoursP1: number;
  reminderIntervalHoursP2: number;
  onCallRotationEnabled: boolean;
  onCallRotationIntervalHours: number;
  onCallRotationAnchorAt: string;
};

type NumericQuotaField =
  | "apiRequestsPerMinute"
  | "incidentsPerDay"
  | "triageRunsPerDay"
  | "customerUpdatesPerDay"
  | "reminderEmailsPerDay"
  | "reminderIntervalHoursP1"
  | "reminderIntervalHoursP2"
  | "onCallRotationIntervalHours";

type PlanLimits = {
  apiRequestsPerMinute: number;
  incidentsPerDay: number;
  triageRunsPerDay: number;
  customerUpdatesPerDay: number;
  reminderEmailsPerDay: number;
};

type Props = {
  initialQuota: Quota;
  planTier: string;
  planLimits?: PlanLimits;
};

export function QuotaSettingsPanel({ initialQuota, planTier, planLimits }: Props) {
  const [quota, setQuota] = useState<Quota>(initialQuota);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasChanges = JSON.stringify(quota) !== JSON.stringify(initialQuota);

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
    setTimeout(() => setMessage(null), 3000);
  }

  function updateField(field: NumericQuotaField, value: string) {
    const parsed = Number(value);
    const max = (planLimits as Record<string, number> | undefined)?.[field] ?? 1000000;
    setQuota((prev) => ({
      ...prev,
      [field]: Number.isFinite(parsed) ? Math.max(0, Math.min(Math.floor(parsed), max)) : 0,
    }));
  }

  return (
    <div className="space-y-12 max-w-4xl">
      {(message || error) && (
        <div className={`p-4 text-sm rounded-xl border flex items-center gap-2 ${error ? "bg-[rgba(232,66,66,0.08)] border-[rgba(232,66,66,0.24)] text-[var(--color-danger)]" : "bg-[rgba(22,163,74,0.08)] border-[rgba(22,163,74,0.24)] text-[var(--color-resolve)]"}`}>
          {error ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <span>{error || message}</span>
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        <label className="block space-y-3">
          <span className="text-sm font-medium text-[var(--color-body)]">
            API requests / minute
            {planLimits && <span className="text-xs text-[var(--color-ghost)] ml-2">(max {planLimits.apiRequestsPerMinute.toLocaleString()})</span>}
          </span>
          <input
            className="w-full bg-transparent border-b border-[var(--color-rim)] pb-2 text-[var(--color-title)] focus:outline-none focus:border-[var(--color-signal)] transition-colors placeholder:text-[var(--color-ghost)]"
            type="number"
            min={1}
            max={planLimits?.apiRequestsPerMinute ?? 1000000}
            value={quota.apiRequestsPerMinute}
            onChange={(event) => updateField("apiRequestsPerMinute", event.target.value)}
            disabled={loading}
          />
        </label>

        <label className="block space-y-3">
          <span className="text-sm font-medium text-[var(--color-body)]">
            Incidents / day
            {planLimits && <span className="text-xs text-[var(--color-ghost)] ml-2">(max {planLimits.incidentsPerDay.toLocaleString()})</span>}
          </span>
          <input
            className="w-full bg-transparent border-b border-[var(--color-rim)] pb-2 text-[var(--color-title)] focus:outline-none focus:border-[var(--color-signal)] transition-colors placeholder:text-[var(--color-ghost)]"
            type="number"
            min={1}
            max={planLimits?.incidentsPerDay ?? 1000000}
            value={quota.incidentsPerDay}
            onChange={(event) => updateField("incidentsPerDay", event.target.value)}
            disabled={loading}
          />
        </label>

        <label className="block space-y-3">
          <span className="text-sm font-medium text-[var(--color-body)]">
            AI triage runs / day
            {planLimits && <span className="text-xs text-[var(--color-ghost)] ml-2">(max {planLimits.triageRunsPerDay.toLocaleString()})</span>}
          </span>
          <input
            className="w-full bg-transparent border-b border-[var(--color-rim)] pb-2 text-[var(--color-title)] focus:outline-none focus:border-[var(--color-signal)] transition-colors placeholder:text-[var(--color-ghost)]"
            type="number"
            min={1}
            max={planLimits?.triageRunsPerDay ?? 1000000}
            value={quota.triageRunsPerDay}
            onChange={(event) => updateField("triageRunsPerDay", event.target.value)}
            disabled={loading}
          />
        </label>

        <label className="block space-y-3">
          <span className="text-sm font-medium text-[var(--color-body)]">
            Customer update drafts / day
            {planLimits && <span className="text-xs text-[var(--color-ghost)] ml-2">(max {planLimits.customerUpdatesPerDay.toLocaleString()})</span>}
          </span>
          <input
            className="w-full bg-transparent border-b border-[var(--color-rim)] pb-2 text-[var(--color-title)] focus:outline-none focus:border-[var(--color-signal)] transition-colors placeholder:text-[var(--color-ghost)]"
            type="number"
            min={1}
            max={planLimits?.customerUpdatesPerDay ?? 1000000}
            value={quota.customerUpdatesPerDay}
            onChange={(event) => updateField("customerUpdatesPerDay", event.target.value)}
            disabled={loading}
          />
        </label>

        <label className="block space-y-3 md:col-span-2">
          <span className="text-sm font-medium text-[var(--color-body)]">
            Reminder emails / day
            {planLimits && <span className="text-xs text-[var(--color-ghost)] ml-2">(max {planLimits.reminderEmailsPerDay.toLocaleString()})</span>}
          </span>
          <input
            className="w-full bg-transparent border-b border-[var(--color-rim)] pb-2 text-[var(--color-title)] focus:outline-none focus:border-[var(--color-signal)] transition-colors placeholder:text-[var(--color-ghost)]"
            type="number"
            min={1}
            max={planLimits?.reminderEmailsPerDay ?? 1000000}
            value={quota.reminderEmailsPerDay}
            onChange={(event) => updateField("reminderEmailsPerDay", event.target.value)}
            disabled={loading}
          />
        </label>

        <label className="block space-y-3">
          <span className="text-sm font-medium text-[var(--color-body)]">P1 reminder interval (hours)</span>
          <input
            className="w-full bg-transparent border-b border-[var(--color-rim)] pb-2 text-[var(--color-title)] focus:outline-none focus:border-[var(--color-signal)] transition-colors placeholder:text-[var(--color-ghost)]"
            type="number"
            min={1}
            max={168}
            value={quota.reminderIntervalHoursP1}
            onChange={(event) => updateField("reminderIntervalHoursP1", event.target.value)}
            disabled={loading}
          />
        </label>

        <label className="block space-y-3">
          <span className="text-sm font-medium text-[var(--color-body)]">P2 reminder interval (hours)</span>
          <input
            className="w-full bg-transparent border-b border-[var(--color-rim)] pb-2 text-[var(--color-title)] focus:outline-none focus:border-[var(--color-signal)] transition-colors placeholder:text-[var(--color-ghost)]"
            type="number"
            min={1}
            max={336}
            value={quota.reminderIntervalHoursP2}
            onChange={(event) => updateField("reminderIntervalHoursP2", event.target.value)}
            disabled={loading}
          />
        </label>
      </div>

      <div className="py-6 border-y border-[var(--color-rim)] space-y-8">
        <UpgradeGate allowed={isFeatureAllowed(planTier, "on_call")} planLabel="Pro">
          <div className="space-y-8">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                className="h-4 w-4 rounded border-[var(--color-rim)] bg-transparent text-[var(--color-signal)] focus:ring-[var(--color-signal)] focus:ring-offset-0"
                checked={quota.onCallRotationEnabled}
                onChange={(event) =>
                  setQuota((prev) => ({
                    ...prev,
                    onCallRotationEnabled: event.target.checked,
                  }))
                }
                type="checkbox"
              />
              <span className="text-sm text-[var(--color-subtext)] group-hover:text-[var(--color-body)] transition-colors">
                Enable on-call rotation for P1 SMS escalations
              </span>
            </label>

            {quota.onCallRotationEnabled && (
              <div className="grid gap-8 md:grid-cols-2">
                <label className="block space-y-3">
                  <span className="text-sm font-medium text-[var(--color-body)]">Rotation interval (hours)</span>
                  <input
                    className="w-full bg-transparent border-b border-[var(--color-rim)] pb-2 text-[var(--color-title)] focus:outline-none focus:border-[var(--color-signal)] transition-colors placeholder:text-[var(--color-ghost)]"
                    type="number"
                    min={1}
                    max={168}
                    value={quota.onCallRotationIntervalHours}
                    onChange={(event) => updateField("onCallRotationIntervalHours", event.target.value)}
                    disabled={loading}
                  />
                </label>

                <div className="space-y-3">
                  <span className="text-sm font-medium text-[var(--color-body)] block">Rotation anchor</span>
                  <div className="flex items-center justify-between gap-4 border-b border-[var(--color-rim)] pb-1.5">
                    <span className="text-sm text-[var(--color-title)]">
                      {new Date(quota.onCallRotationAnchorAt).toLocaleString("en-US")}
                    </span>
                    <button
                      className="text-[10px] uppercase tracking-wider text-[var(--color-signal)] hover:text-[var(--color-signal)] transition-colors flex items-center gap-1"
                      type="button"
                      onClick={() =>
                        setQuota((prev) => ({
                          ...prev,
                          onCallRotationAnchorAt: new Date().toISOString(),
                        }))
                      }
                    >
                      <RefreshCcw className="w-3 h-3" /> Reset
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </UpgradeGate>
      </div>

      <div className="flex items-center justify-between pt-4">
        <p className="text-sm text-[var(--color-ghost)]">
          {hasChanges ? "Changes not yet applied." : "Quotas are current."}
        </p>
        <button 
          className="btn btn-primary" 
          disabled={loading || !hasChanges} 
          onClick={save} 
          type="button"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save quotas"}
        </button>
      </div>
    </div>
  );
}
