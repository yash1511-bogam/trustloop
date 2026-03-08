"use client";

import { useState } from "react";

type Profile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
};

type Props = {
  profile: Profile;
};

export function ProfileSettingsPanel({ profile }: Props) {
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

    setMessage("Profile saved.");
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Name</span>
          <input
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Work email</span>
          <input className="input" value={profile.email} disabled />
        </label>
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="font-medium">On-call phone (E.164, optional)</span>
          <input
            className="input"
            placeholder="+14155552671"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </label>
      </div>

      <button className="btn btn-primary" disabled={loading} onClick={save} type="button">
        {loading ? "Saving..." : "Save profile"}
      </button>

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
