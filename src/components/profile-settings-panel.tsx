"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "@/components/icon-compat";
import { PlanBadge, UpgradeGate } from "@/components/upgrade-gate";
import { isFeatureAllowed } from "@/lib/feature-gate";

type Profile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
};

type Props = {
  profile: Profile;
  planTier: string;
};

export function ProfileSettingsPanel({ profile, planTier }: Props) {
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasChanges = name !== profile.name || phone !== (profile.phone ?? "");

  async function save() {
    setLoading(true);
    setMessage(null);
    setError(null);

    const response = await fetch("/api/settings/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone }),
    });

    setLoading(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Could not save profile.");
      return;
    }

    setMessage("Profile saved successfully.");
    setTimeout(() => setMessage(null), 3000);
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {(message || error) && (
        <div className={`p-4 text-sm rounded-xl border flex items-center gap-2 ${error ? "bg-[rgba(232,66,66,0.08)] border-[rgba(232,66,66,0.24)] text-[var(--color-danger)]" : "bg-[rgba(22,163,74,0.08)] border-[rgba(22,163,74,0.24)] text-[var(--color-resolve)]"}`}>
          {error ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <span>{error || message}</span>
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        <label className="block space-y-3">
          <span className="text-sm font-medium text-[var(--color-body)]">Name</span>
          <input
            className="w-full bg-transparent border-b border-[var(--color-rim)] pb-2 text-[var(--color-title)] focus:outline-none focus:border-[var(--color-signal)] transition-colors placeholder:text-[var(--color-ghost)]"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={loading}
          />
        </label>
        
        <label className="block space-y-3">
          <span className="text-sm font-medium text-[var(--color-body)] flex items-center gap-2">
            Work email
            <span className="text-xs text-[var(--color-ghost)]" title="Email cannot be changed. It is linked to your authentication provider.">ⓘ</span>
          </span>
          <input 
            className="w-full bg-transparent border-b border-[var(--color-rim)] pb-2 text-[var(--color-subtext)] focus:outline-none opacity-60 cursor-not-allowed" 
            value={profile.email} 
            disabled
            title="Email cannot be changed. It is linked to your authentication provider."
          />
        </label>

        <UpgradeGate allowed={isFeatureAllowed(planTier, "on_call")} planLabel="Pro">
          <label className="block space-y-3 md:col-span-2">
            <span className="text-sm font-medium text-[var(--color-body)] flex items-center justify-between">
              <span>
                On-call phone
                <PlanBadge allowed={isFeatureAllowed(planTier, "on_call")} planLabel="Pro" />
              </span>
              <span className="text-xs text-[var(--color-ghost)] font-normal border border-[var(--color-rim)] px-2 py-0.5 rounded-full">E.164 Format</span>
            </span>
            <input
              className="w-full bg-transparent border-b border-[var(--color-rim)] pb-2 text-[var(--color-title)] focus:outline-none focus:border-[var(--color-signal)] transition-colors placeholder:text-[var(--color-ghost)]"
              placeholder="+14155552671"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-[var(--color-ghost)] mt-2">
              Get P1 SMS alerts when incidents escalate. Used exclusively for high-severity incident escalations.
            </p>
          </label>
        </UpgradeGate>
      </div>

      <div className="pt-4 flex items-center justify-between border-t border-[var(--color-rim)]">
        <p className="text-sm text-[var(--color-ghost)]">
          {hasChanges ? "You have unsaved changes." : "Profile is up to date."}
        </p>
        <button 
          className={`btn btn-primary ${hasChanges ? "shadow-[0_0_12px_rgba(212,98,43,0.25)]" : ""}`} 
          disabled={loading || !hasChanges} 
          onClick={save} 
          type="button"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving
            </>
          ) : "Save changes"}
        </button>
      </div>
    </div>
  );
}
