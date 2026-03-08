"use client";

import { useMemo, useState } from "react";

type WorkspaceSettings = {
  id: string;
  name: string;
  slug: string | null;
  statusPageEnabled: boolean;
  planTier: string;
  slackChannelId: string | null;
  slackTeamId: string | null;
  samlEnabled: boolean;
  samlMetadataUrl: string | null;
  billing: {
    dodoCustomerId: string | null;
    dodoSubscriptionId: string | null;
    status: string;
  } | null;
};

type Props = {
  workspace: WorkspaceSettings;
  slackInstallUrl: string;
};

export function WorkspaceSettingsPanel({ workspace, slackInstallUrl }: Props) {
  const [form, setForm] = useState({
    slug: workspace.slug ?? "",
    statusPageEnabled: workspace.statusPageEnabled,
    slackChannelId: workspace.slackChannelId ?? "",
    samlEnabled: workspace.samlEnabled,
    samlMetadataUrl: workspace.samlMetadataUrl ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const statusPageUrl = useMemo(() => {
    if (!form.slug) {
      return null;
    }
    const origin =
      typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL;
    return `${origin?.replace(/\/$/, "")}/status/${form.slug}`;
  }, [form.slug]);

  async function save() {
    setLoading(true);
    setMessage(null);
    setError(null);

    const response = await fetch("/api/settings/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        slug: form.slug.toLowerCase(),
      }),
    });

    setLoading(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Failed to save workspace settings.");
      return;
    }

    setMessage("Workspace settings saved.");
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Public status slug</span>
          <input
            className="input"
            value={form.slug}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                slug: event.target.value,
              }))
            }
            placeholder="acme-ai"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium">Slack incident channel ID</span>
          <input
            className="input"
            value={form.slackChannelId}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                slackChannelId: event.target.value,
              }))
            }
            placeholder="C0123456789"
          />
        </label>

        <label className="space-y-1 text-sm md:col-span-2">
          <span className="font-medium">SAML metadata URL (enterprise)</span>
          <input
            className="input"
            value={form.samlMetadataUrl}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                samlMetadataUrl: event.target.value,
              }))
            }
            placeholder="https://idp.example.com/metadata"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            checked={form.statusPageEnabled}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                statusPageEnabled: event.target.checked,
              }))
            }
            type="checkbox"
          />
          Enable public status page
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            checked={form.samlEnabled}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                samlEnabled: event.target.checked,
              }))
            }
            type="checkbox"
          />
          Enable SAML SSO (enterprise)
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" disabled={loading} onClick={save} type="button">
          {loading ? "Saving..." : "Save workspace settings"}
        </button>
        <a className="btn btn-ghost" href={slackInstallUrl}>
          {workspace.slackTeamId ? "Reconnect Slack app" : "Connect Slack app"}
        </a>
        {statusPageUrl ? (
          <a className="btn btn-ghost" href={statusPageUrl} target="_blank">
            Open status page
          </a>
        ) : null}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
        <p>
          Current plan: <strong>{workspace.planTier}</strong>
        </p>
        <p>
          Slack team connected: <strong>{workspace.slackTeamId ?? "No"}</strong>
        </p>
        <p>
          Dodo customer: <strong>{workspace.billing?.dodoCustomerId ?? "Not linked"}</strong>
        </p>
        <p>
          Dodo subscription: <strong>{workspace.billing?.dodoSubscriptionId ?? "Not linked"}</strong>
        </p>
        <p>
          Billing status: <strong>{workspace.billing?.status ?? "NONE"}</strong>
        </p>
      </div>

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
