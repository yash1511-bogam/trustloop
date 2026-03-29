"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, ExternalLink, ShieldCheck } from "@/components/icon-compat";

const SlackIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.163 0a2.528 2.528 0 012.523 2.522v6.312zM15.163 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.163 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 01-2.52-2.523 2.527 2.527 0 012.52-2.52h6.315A2.528 2.528 0 0124 15.163a2.528 2.528 0 01-2.522 2.523h-6.315z" />
  </svg>
);
import { PlanBadge, UpgradeGate } from "@/components/upgrade-gate";
import { isFeatureAllowed } from "@/lib/feature-gate";

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

    async function loadSlackChannels() {
      setChannelsLoading(true);
      try {
        const res = await fetch("/api/slack/channels");
        const data = (await res.json()) as {
          channels?: Array<{ id: string; name: string; isMember: boolean }>;
        };
        setSlackChannels(data.channels ?? []);
      } catch {
        setSlackChannels([]);
      } finally {
        setChannelsLoading(false);
      }
    }

    void loadSlackChannels();
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
        <div className={`p-4 text-sm rounded-xl border flex items-center gap-2 ${error ? "bg-[rgba(232,66,66,0.08)] border-[rgba(232,66,66,0.24)] text-[var(--color-danger)]" : "bg-[rgba(22,163,74,0.08)] border-[rgba(22,163,74,0.24)] text-[var(--color-resolve)]"}`}>
          {error ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <span>{error || message}</span>
        </div>
      )}

      {!workspace.slackTeamId && (
        <div className="flex items-center gap-4 rounded-[var(--radius-md)] border border-[var(--color-rim)] bg-[var(--color-surface)] p-4">
          <SlackIcon className="w-6 h-6 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--color-body)]">Connect Slack</p>
            <p className="text-xs text-[var(--color-ghost)]">Keep responders aligned with alerting and approved status updates.</p>
          </div>
          <a className="btn btn-primary btn-sm" href={slackInstallUrl}>
            <SlackIcon className="w-4 h-4" />
            Connect
          </a>
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        <label className="block space-y-3">
          <span className="text-sm font-medium text-[var(--color-body)] flex items-center justify-between">
            Public status slug
            {statusPageUrl && (
              <a href={statusPageUrl} target="_blank" className="text-[10px] uppercase tracking-wider text-[var(--color-signal)] hover:text-[var(--color-signal)] transition-colors flex items-center gap-1">
                View page <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </span>
          <input
            className="w-full bg-transparent border-b border-[var(--color-rim)] pb-2 text-[var(--color-title)] focus:outline-none focus:border-[var(--color-signal)] transition-colors placeholder:text-[var(--color-ghost)]"
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
          <span className="text-sm font-medium text-[var(--color-body)]">Slack incident channel</span>
          {workspace.slackTeamId && slackChannels.length > 0 ? (
            <select
              className="w-full bg-transparent border-b border-[var(--color-rim)] pb-2 text-[var(--color-title)] focus:outline-none focus:border-[var(--color-signal)] transition-colors"
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
              className="w-full bg-transparent border-b border-[var(--color-rim)] pb-2 text-[var(--color-title)] focus:outline-none focus:border-[var(--color-signal)] transition-colors placeholder:text-[var(--color-ghost)]"
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

        <UpgradeGate allowed={isFeatureAllowed(workspace.planTier, "saml")} planLabel="Enterprise">
          <label className="block space-y-3">
            <span className="text-sm font-medium text-[var(--color-body)]">
              SAML metadata URL
              <PlanBadge allowed={isFeatureAllowed(workspace.planTier, "saml")} planLabel="Enterprise" />
            </span>
            <input
              className="w-full bg-transparent border-b border-[var(--color-rim)] pb-2 text-[var(--color-title)] focus:outline-none focus:border-[var(--color-signal)] transition-colors placeholder:text-[var(--color-ghost)]"
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
        </UpgradeGate>
      </div>

      <div className="flex flex-wrap items-center gap-8 py-4 border-y border-[var(--color-rim)]">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            className="h-4 w-4 rounded border-[var(--color-rim)] bg-transparent text-[var(--color-signal)] focus:ring-[var(--color-signal)] focus:ring-offset-0"
            checked={form.statusPageEnabled}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                statusPageEnabled: event.target.checked,
              }))
            }
            type="checkbox"
          />
          <span className="text-sm text-[var(--color-subtext)] group-hover:text-[var(--color-body)] transition-colors">Enable status page</span>
        </label>

        <UpgradeGate allowed={isFeatureAllowed(workspace.planTier, "saml")} planLabel="Enterprise">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              className="h-4 w-4 rounded border-[var(--color-rim)] bg-transparent text-[var(--color-signal)] focus:ring-[var(--color-signal)] focus:ring-offset-0"
              checked={form.samlEnabled}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  samlEnabled: event.target.checked,
                }))
              }
              type="checkbox"
            />
            <span className="text-sm text-[var(--color-subtext)] group-hover:text-[var(--color-body)] transition-colors">Enable SAML SSO</span>
          </label>
        </UpgradeGate>

        <UpgradeGate allowed={isFeatureAllowed(workspace.planTier, "compliance")} planLabel="Pro">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              className="h-4 w-4 rounded border-[var(--color-rim)] bg-transparent text-[var(--color-signal)] focus:ring-[var(--color-signal)] focus:ring-offset-0 disabled:opacity-50"
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
              <span className="text-sm text-[var(--color-subtext)] group-hover:text-[var(--color-body)] transition-colors">Compliance mode</span>
              {form.complianceMode && (
                <span className="text-[10px] text-[var(--color-warning)] font-medium uppercase tracking-tight">Locked</span>
              )}
            </div>
          </label>
        </UpgradeGate>
      </div>

      {form.complianceMode && !workspace.complianceMode && (
        <div className="flex items-start gap-3 rounded-xl border border-[rgba(217,119,6,0.24)] bg-[rgba(217,119,6,0.08)] p-4 text-xs text-[var(--color-warning)]">
          <ShieldCheck className="w-4 h-4 shrink-0 text-[var(--color-warning)]" />
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
            <SlackIcon className="w-4 h-4" />
            {workspace.slackTeamId ? "Reconnect Slack" : "Connect Slack"}
          </a>
        </div>
        
        <p className="text-xs text-[var(--color-ghost)] italic">
          Workspace ID: <span className="font-mono">{workspace.id}</span>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 pt-12 border-t border-[var(--color-rim)]">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-[var(--color-ghost)] font-medium">Current plan</p>
          <p className="text-sm text-[var(--color-body)]">{workspace.planTier}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-[var(--color-ghost)] font-medium">Slack status</p>
          <p className="text-sm text-[var(--color-body)]">{workspace.slackTeamId ? "Connected" : "Disconnected"}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-[var(--color-ghost)] font-medium">SAML ready</p>
          <p className="text-sm text-[var(--color-body)]">
            {workspace.samlEnabled && workspace.samlMetadataUrl && workspace.samlConnectionId ? "Active" : "Not configured"}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-[var(--color-ghost)] font-medium">Billing status</p>
          <p className="text-sm text-[var(--color-body)] font-medium">{workspace.billing?.status ?? "NONE"}</p>
        </div>
      </div>
    </div>
  );
}
