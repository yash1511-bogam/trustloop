"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { UpgradeGate } from "@/components/upgrade-gate";
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
        <div className={`p-4 text-sm rounded-xl border flex items-center gap-2 ${error ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"}`}>
          {error ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <span>{error || message}</span>
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        <label className="block space-y-3">
          <span className="text-sm font-medium text-slate-300">Name</span>
          <input
            className="w-full bg-transparent border-b border-white/20 pb-2 text-slate-100 focus:outline-none focus:border-sky-400 transition-colors placeholder:text-neutral-600"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={loading}
          />
        </label>
        
        <label className="block space-y-3">
          <span className="text-sm font-medium text-slate-300">Work email</span>
          <input 
            className="w-full bg-transparent border-b border-white/10 pb-2 text-slate-400 focus:outline-none opacity-60 cursor-not-allowed" 
            value={profile.email} 
            disabled 
          />
        </label>

        <UpgradeGate allowed={isFeatureAllowed(planTier, "on_call")} planLabel="Pro">
          <label className="block space-y-3 md:col-span-2">
            <span className="text-sm font-medium text-slate-300 flex items-center justify-between">
              On-call phone
              <span className="text-xs text-neutral-500 font-normal border border-white/10 px-2 py-0.5 rounded-full">E.164 Format</span>
            </span>
            <input
              className="w-full bg-transparent border-b border-white/20 pb-2 text-slate-100 focus:outline-none focus:border-sky-400 transition-colors placeholder:text-neutral-600"
              placeholder="+14155552671"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-neutral-500 mt-2">
              Used exclusively for high-severity P1 incident escalations. Keep this up to date to ensure you never miss critical alerts.
            </p>
          </label>
        </UpgradeGate>
      </div>

      <div className="pt-4 flex items-center justify-between border-t border-white/5">
        <p className="text-sm text-neutral-500">
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
              Saving
            </>
          ) : "Save changes"}
        </button>
      </div>
    </div>
  );
}
