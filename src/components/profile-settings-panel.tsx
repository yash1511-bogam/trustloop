"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "@/components/icon-compat";
import { PlanBadge } from "@/components/upgrade-gate";
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

  const onCallAllowed = isFeatureAllowed(planTier, "on_call");
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
    <div className="space-y-6">
      {(message || error) && (
        <div className={`p-3 text-sm rounded-lg border flex items-center gap-2 ${error ? "bg-[rgba(232,66,66,0.08)] border-[rgba(232,66,66,0.24)] text-[var(--color-danger)]" : "bg-[rgba(22,163,74,0.08)] border-[rgba(22,163,74,0.24)] text-[var(--color-resolve)]"}`}>
          {error ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
          <span>{error || message}</span>
        </div>
      )}

      <div className="space-y-5">
        {/* Row 1: Name + Email */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-[var(--color-ghost)]">Name</label>
            <input
              className="input w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-[var(--color-ghost)] flex items-center gap-1.5">
              Work email
              <span className="text-[10px] text-[var(--color-muted)]" title="Linked to your auth provider">ⓘ</span>
            </label>
            <input
              className="input w-full opacity-50 cursor-not-allowed"
              value={profile.email}
              disabled
            />
          </div>
        </div>

        {/* Row 2: Phone + Role */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-[var(--color-ghost)] flex items-center gap-2 h-5">
              On-call phone
              <PlanBadge allowed={onCallAllowed} planLabel="Pro" />
            </label>
            <input
              className="input w-full disabled:opacity-40 disabled:cursor-not-allowed"
              placeholder="+14155552671"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading || !onCallAllowed}
            />
            <p className="text-[11px] text-[var(--color-muted)]">E.164 format · Used for P1 SMS escalations only</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-[var(--color-ghost)] h-5 flex items-center">Role</label>
            <input className="input w-full opacity-50 cursor-not-allowed" value={profile.role} disabled />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 flex items-center justify-between border-t border-[var(--color-rim)]">
        <p className="text-xs text-[var(--color-ghost)]">
          {hasChanges ? "You have unsaved changes." : "Profile is up to date."}
        </p>
        <button
          className="btn btn-primary"
          disabled={loading || !hasChanges}
          onClick={save}
          type="button"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : "Save changes"}
        </button>
      </div>
    </div>
  );
}
