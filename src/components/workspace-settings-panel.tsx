"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, ExternalLink, ShieldCheck, Slack } from "lucide-react";

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
  samlOrganizationId: string | null;
  samlConnectionId: string | null;
  complianceMode: boolean;
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
    complianceMode: workspace.complianceMode,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slackChannels, setSlackChannels] = useState<Array<{ id: string; name: string; isMember: boolean }>>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);

  useEffect(() => {
    if (!workspace.slackTeamId) return;
    setChannelsLoading(true);
    fetch("/api/slack/channels")
      .then((res) => res.json())
      .then((data: { channels?: Array<{ id: string; name: string; isMember: boolean }> }) => {
        setSlackChannels(data.channels ?? []);
      })
      .catch(() => setSlackChannels([]))
      .finally(() => setChannelsLoading(false));
  }, [workspace.slackTeamId]);

  const hasChanges = 
    form.slug !== (workspace.slug ?? "") ||
    form.statusPageEnabled !== workspace.statusPageEnabled ||
    form.slackChannelId !== (workspace.slackChannelId ?? "") ||
    form.samlEnabled !== workspace.samlEnabled ||
    form.samlMetadataUrl !== (workspace.samlMetadataUrl ?? "") ||
    form.complianceMode !== workspace.complianceMode;

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
    setTimeout(() => setMessage(null), 3000);
  }

  return (
    <div className="space-y-12 max-w-4xl">
      {(message || error) && (
        <div className={`p-4 text-sm rounded-xl border flex items-center gap-2 ${error ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"}`}>
          {error ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <span>{error || message}</span>
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        <label className="block space-y-3">
          <span className="text-sm font-medium text-slate-300 flex items-center justify-between">
            Public status slug
            {statusPageUrl && (
              <a href={statusPageUrl} target="_blank" className="text-[10px] uppercase tracking-wider text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1">
                View page <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </span>
          <input
            className="w-full bg-transparent border-b border-white/20 pb-2 text-slate-100 focus:outline-none focus:border-sky-400 transition-colors placeholder:text-neutral-600"
            value={form.slug}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                slug: event.target.value,
              }))
            }
            placeholder="acme-ai"
            disabled={loading}
          />
        </label>

        <label className="block space-y-3">
          <span className="text-sm font-medium text-slate-300">Slack incident channel</span>
          {workspace.slackTeamId && slackChannels.length > 0 ? (
            <select
              className="w-full bg-transparent border-b border-white/20 pb-2 text-slate-100 focus:outline-none focus:border-sky-400 transition-colors"
              value={form.slackChannelId}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  slackChannelId: event.target.value,
                }))
              }
              disabled={loading}
            >
              <option value="">Select a channel</option>
              {slackChannels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  #{ch.name}{ch.isMember ? "" : " (bot not in channel)"}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="w-full bg-transparent border-b border-white/20 pb-2 text-slate-100 focus:outline-none focus:border-sky-400 transition-colors placeholder:text-neutral-600"
              value={form.slackChannelId}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  slackChannelId: event.target.value,
                }))
              }
              placeholder={channelsLoading ? "Loading channels…" : "C0123456789"}
              disabled={loading || channelsLoading}
            />
          )}
        </label>

        <label className="block space-y-3 md:col-span-2">
          <span className="text-sm font-medium text-slate-300">SAML metadata URL (enterprise)</span>
          <input
            className="w-full bg-transparent border-b border-white/20 pb-2 text-slate-100 focus:outline-none focus:border-sky-400 transition-colors placeholder:text-neutral-600"
            value={form.samlMetadataUrl}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                samlMetadataUrl: event.target.value,
              }))
            }
            placeholder="https://idp.example.com/metadata"
            disabled={loading}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-8 py-4 border-y border-white/5">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            className="w-4 h-4 rounded border-white/20 bg-transparent text-sky-500 focus:ring-sky-500 focus:ring-offset-0"
            checked={form.statusPageEnabled}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                statusPageEnabled: event.target.checked,
              }))
            }
            type="checkbox"
          />
          <span className="text-sm text-neutral-400 group-hover:text-slate-200 transition-colors">Enable status page</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            className="w-4 h-4 rounded border-white/20 bg-transparent text-sky-500 focus:ring-sky-500 focus:ring-offset-0"
            checked={form.samlEnabled}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                samlEnabled: event.target.checked,
              }))
            }
            type="checkbox"
          />
          <span className="text-sm text-neutral-400 group-hover:text-slate-200 transition-colors">Enable SAML SSO</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            className="w-4 h-4 rounded border-white/20 bg-transparent text-sky-500 focus:ring-sky-500 focus:ring-offset-0 disabled:opacity-50"
            checked={form.complianceMode}
            disabled={workspace.complianceMode}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                complianceMode: event.target.checked,
              }))
            }
            type="checkbox"
          />
          <div className="flex flex-col">
            <span className="text-sm text-neutral-400 group-hover:text-slate-200 transition-colors">Compliance mode</span>
            {form.complianceMode && (
              <span className="text-[10px] text-amber-500 font-medium uppercase tracking-tight">Locked</span>
            )}
          </div>
        </label>
      </div>

      {form.complianceMode && !workspace.complianceMode && (
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 text-xs text-amber-200/70 flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 shrink-0 text-amber-500" />
          <p>
            Enabling compliance mode prevents incident deletion and keeps historical records immutable. 
            Once saved, this setting <strong>cannot be disabled</strong>.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-6 pt-4">
        <div className="flex flex-wrap gap-3">
          <button className="btn btn-primary" disabled={loading || !hasChanges} onClick={save} type="button">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save workspace"}
          </button>
          <a className="btn btn-ghost" href={slackInstallUrl}>
            <Slack className="w-4 h-4" />
            {workspace.slackTeamId ? "Reconnect Slack" : "Connect Slack"}
          </a>
        </div>
        
        <p className="text-xs text-neutral-500 italic">
          Workspace ID: <span className="font-mono">{workspace.id}</span>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 pt-12 border-t border-white/5">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">Current plan</p>
          <p className="text-sm text-slate-200">{workspace.planTier}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">Slack status</p>
          <p className="text-sm text-slate-200">{workspace.slackTeamId ? "Connected" : "Disconnected"}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">SAML ready</p>
          <p className="text-sm text-slate-200">
            {workspace.samlEnabled && workspace.samlMetadataUrl && workspace.samlConnectionId ? "Active" : "Not configured"}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">Billing status</p>
          <p className="text-sm text-slate-200 font-medium">{workspace.billing?.status ?? "NONE"}</p>
        </div>
      </div>
    </div>
  );
}
