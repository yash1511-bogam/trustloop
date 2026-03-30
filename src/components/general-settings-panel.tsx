"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, CheckCircle2, AlertCircle, ExternalLink, ShieldCheck } from "@/components/icon-compat";
import { PlanBadge } from "@/components/upgrade-gate";
import { CaretDown } from "@phosphor-icons/react";

type Workspace = {
  id: string;
  name: string;
  slug: string | null;
  statusPageEnabled: boolean;
  slackChannelId: string | null;
  slackTeamId: string | null;
  complianceMode: boolean;
};

type Props = {
  workspace: Workspace;
  slackInstallUrl: string;
  planTier: string;
  complianceAllowed: boolean;
};

function SectionAccordion({
  title,
  description,
  trailing,
  defaultOpen = false,
  children,
  disabled,
}: {
  title: string;
  description: string;
  trailing?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={disabled ? "opacity-50 pointer-events-none select-none" : ""}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left group"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] font-semibold text-[var(--color-title)] tracking-[-0.01em]">{title}</h3>
            {trailing}
          </div>
          <p className="text-xs text-[var(--color-ghost)] mt-0.5 leading-relaxed">{description}</p>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="shrink-0 text-[var(--color-ghost)] group-hover:text-[var(--color-subtext)] transition-colors"
        >
          <CaretDown size={16} weight="bold" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ overflow: "hidden" }}
          >
            <div className="pb-5 space-y-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function GeneralSettingsPanel({ workspace, slackInstallUrl, planTier, complianceAllowed }: Props) {
  const [form, setForm] = useState({
    slug: workspace.slug ?? "",
    statusPageEnabled: workspace.statusPageEnabled,
    slackChannelId: workspace.slackChannelId ?? "",
    complianceMode: workspace.complianceMode,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [channels, setChannels] = useState<Array<{ id: string; name: string; isMember: boolean }>>([]);

  useEffect(() => {
    if (!workspace.slackTeamId) return;
    fetch("/api/slack/channels")
      .then((r) => r.json())
      .then((d: { channels?: typeof channels }) => setChannels(d.channels ?? []))
      .catch(() => {});
  }, [workspace.slackTeamId]);

  const hasChanges =
    form.slug !== (workspace.slug ?? "") ||
    form.statusPageEnabled !== workspace.statusPageEnabled ||
    form.slackChannelId !== (workspace.slackChannelId ?? "") ||
    form.complianceMode !== workspace.complianceMode;

  const [customDomainUrl, setCustomDomainUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/custom-domain")
      .then((r) => r.json())
      .then((d: { domain?: string; verified?: boolean }) => {
        if (d.domain && d.verified) setCustomDomainUrl(`https://${d.domain}`);
      })
      .catch(() => {});
  }, []);

  const statusPageUrl = useMemo(() => {
    if (customDomainUrl) return customDomainUrl;
    if (!form.slug) return null;
    return `/${form.slug}/status`;
  }, [form.slug, customDomainUrl]);

  async function save() {
    setLoading(true); setMessage(null); setError(null);
    const r = await fetch("/api/settings/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, slug: form.slug.toLowerCase() }),
    });
    setLoading(false);
    if (!r.ok) {
      const p = (await r.json().catch(() => null)) as { error?: string } | null;
      setError(p?.error ?? "Failed to save."); return;
    }
    setMessage("Settings saved."); setTimeout(() => setMessage(null), 3000);
  }

  return (
    <div>
      {/* Toast */}
      <AnimatePresence>
        {(message || error) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className={`mb-4 p-3 text-sm rounded-lg border flex items-center gap-2 ${error ? "bg-[rgba(232,66,66,0.08)] border-[rgba(232,66,66,0.24)] text-[var(--color-danger)]" : "bg-[rgba(22,163,74,0.08)] border-[rgba(22,163,74,0.24)] text-[var(--color-resolve)]"}`}
          >
            {error ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
            <span>{error || message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Workspace info strip ── */}
      <div className="flex items-center gap-6 py-4 text-xs">
        <div>
          <span className="text-[var(--color-ghost)] font-medium">Workspace</span>
          <span className="ml-2 text-[var(--color-title)] font-semibold">{workspace.name}</span>
        </div>
        <span className="w-px h-3 bg-[var(--color-rim)]" />
        <div>
          <span className="text-[var(--color-ghost)] font-medium">Plan</span>
          <span className="ml-2 text-[var(--color-title)] font-semibold capitalize">{planTier}</span>
        </div>
        <span className="w-px h-3 bg-[var(--color-rim)]" />
        <div>
          <span className="text-[var(--color-ghost)] font-medium">Slack</span>
          <span className="ml-2 text-[var(--color-title)] font-semibold">{workspace.slackTeamId ? "Connected" : "Not connected"}</span>
        </div>
      </div>

      <div className="h-px bg-[var(--color-rim)]" />

      {/* ── Status Page ── */}
      <SectionAccordion
        title="Public status page"
        description="Let customers check incident status at a public URL."
        defaultOpen
        trailing={
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${form.statusPageEnabled ? "bg-[var(--color-resolve)]" : "bg-[var(--color-ghost)]"}`} />
        }
      >
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--color-subtext)]">Enable status page</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={form.statusPageEnabled}
              onChange={(e) => setForm((p) => ({ ...p, statusPageEnabled: e.target.checked }))}
              disabled={loading}
            />
            <div className="w-9 h-5 bg-[var(--color-rim)] peer-focus:ring-2 peer-focus:ring-[var(--color-signal)] rounded-full peer peer-checked:bg-[var(--color-signal)] transition-colors after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
          </label>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium uppercase tracking-widest text-[var(--color-ghost)]">Status page slug</label>
          <div className="flex items-center gap-2">
            <input
              className="input flex-1"
              value={form.slug}
              onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
              placeholder="acme-ai"
              disabled={loading}
            />
            {statusPageUrl && (
              <a href={statusPageUrl} target="_blank" className="btn btn-ghost !min-h-[36px] text-xs shrink-0">
                <ExternalLink className="w-3.5 h-3.5" /> Preview
              </a>
            )}
          </div>
          {statusPageUrl && <p className="text-[10px] text-[var(--color-ghost)] font-mono">{statusPageUrl}</p>}
        </div>
      </SectionAccordion>

      <div className="h-px bg-[var(--color-rim)]" />

      {/* ── Custom Domain ── */}
      <SectionAccordion
        title="Custom status page domain"
        description="Point your own domain to your TrustLoop status page via DNS CNAME."
      >
        <CustomDomainSettings />
      </SectionAccordion>

      <div className="h-px bg-[var(--color-rim)]" />

      {/* ── Slack ── */}
      <SectionAccordion
        title="Slack integration"
        description="Route incident alerts and updates to a Slack channel."
        trailing={
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${workspace.slackTeamId ? "bg-[var(--color-resolve)]" : "bg-[var(--color-ghost)]"}`} />
        }
      >
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--color-subtext)]">{workspace.slackTeamId ? "Slack is connected" : "Connect Slack to configure channel routing"}</span>
          <a className="btn btn-ghost !min-h-[32px] text-xs" href={slackInstallUrl}>
            {workspace.slackTeamId ? "Reconnect" : "Connect Slack"}
          </a>
        </div>
        {workspace.slackTeamId && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium uppercase tracking-widest text-[var(--color-ghost)]">Incident channel</label>
            {channels.length > 0 ? (
              <select
                className="input w-full"
                value={form.slackChannelId}
                onChange={(e) => setForm((p) => ({ ...p, slackChannelId: e.target.value }))}
                disabled={loading}
              >
                <option value="">Select a channel</option>
                {channels.map((ch) => (
                  <option key={ch.id} value={ch.id}>#{ch.name}{ch.isMember ? "" : " (bot not in channel)"}</option>
                ))}
              </select>
            ) : (
              <input
                className="input w-full"
                value={form.slackChannelId}
                onChange={(e) => setForm((p) => ({ ...p, slackChannelId: e.target.value }))}
                placeholder="C0123456789"
                disabled={loading}
              />
            )}
          </div>
        )}
      </SectionAccordion>

      <div className="h-px bg-[var(--color-rim)]" />

      {/* ── Compliance Mode ── */}
      <SectionAccordion
        title="Compliance mode"
        description="Prevent incident deletion and keep historical records immutable."
        disabled={!complianceAllowed}
        trailing={<PlanBadge allowed={complianceAllowed} planLabel="Pro" />}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--color-subtext)]">Enable compliance mode</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={form.complianceMode}
              onChange={(e) => setForm((p) => ({ ...p, complianceMode: e.target.checked }))}
              disabled={loading || workspace.complianceMode || !complianceAllowed}
            />
            <div className="w-9 h-5 bg-[var(--color-rim)] peer-focus:ring-2 peer-focus:ring-[var(--color-signal)] rounded-full peer peer-checked:bg-[var(--color-signal)] transition-colors after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
          </label>
        </div>
        {form.complianceMode && workspace.complianceMode && (
          <div className="flex items-center gap-2 text-[10px] text-[var(--color-warning)] font-medium uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" /> Locked — cannot be disabled
          </div>
        )}
        {form.complianceMode && !workspace.complianceMode && (
          <div className="flex items-start gap-2 rounded-lg border border-[rgba(217,119,6,0.24)] bg-[rgba(217,119,6,0.06)] p-3 text-xs text-[var(--color-warning)]">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <p>Once saved, compliance mode <strong>cannot be disabled</strong>. Incident deletion will be permanently blocked.</p>
          </div>
        )}
      </SectionAccordion>

      <div className="h-px bg-[var(--color-rim)]" />

      {/* ── Save ── */}
      <div className="flex items-center justify-between pt-5">
        <p className="text-xs text-[var(--color-ghost)]">{hasChanges ? "You have unsaved changes." : "Settings are up to date."}</p>
        <button className="btn btn-primary" disabled={loading || !hasChanges} onClick={save} type="button">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function CustomDomainSettings() {
  const [domain, setDomain] = useState("");
  const [input, setInput] = useState("");
  const [verified, setVerified] = useState(false);
  const [cnameTarget, setCnameTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/settings/custom-domain")
      .then((r) => r.json())
      .then((d: { domain?: string; verified?: boolean; cnameTarget?: string }) => {
        setDomain(d.domain ?? "");
        setInput(d.domain ?? "");
        setVerified(d.verified ?? false);
        setCnameTarget(d.cnameTarget ?? "");
      })
      .catch(() => {});
  }, []);

  async function saveDomain() {
    setLoading(true); setMsg(null);
    const r = await fetch("/api/settings/custom-domain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: input }),
    });
    const d = await r.json().catch(() => null) as { domain?: string; verified?: boolean; cnameTarget?: string; error?: string } | null;
    setLoading(false);
    if (!r.ok) { setMsg({ type: "err", text: d?.error ?? "Failed to save." }); return; }
    setDomain(d?.domain ?? input);
    setVerified(d?.verified ?? false);
    setCnameTarget(d?.cnameTarget ?? cnameTarget);
    setMsg({ type: "ok", text: d?.verified ? "Domain verified and active!" : "Domain saved. Add the CNAME record below, then verify." });
  }

  async function checkVerification() {
    setChecking(true); setMsg(null);
    const r = await fetch("/api/settings/custom-domain");
    const d = await r.json().catch(() => null) as { verified?: boolean } | null;
    setChecking(false);
    setVerified(d?.verified ?? false);
    setMsg({ type: d?.verified ? "ok" : "err", text: d?.verified ? "Domain verified!" : "CNAME not found yet. DNS can take up to 48 hours to propagate." });
  }

  async function removeDomain() {
    setLoading(true); setMsg(null);
    await fetch("/api/settings/custom-domain", { method: "DELETE" });
    setLoading(false);
    setDomain(""); setInput(""); setVerified(false);
    setMsg({ type: "ok", text: "Custom domain removed." });
  }

  return (
    <div className="space-y-4">
      {msg && (
        <div className={`p-3 text-xs rounded-lg border flex items-center gap-2 ${msg.type === "err" ? "bg-[rgba(232,66,66,0.08)] border-[rgba(232,66,66,0.24)] text-[var(--color-danger)]" : "bg-[rgba(22,163,74,0.08)] border-[rgba(22,163,74,0.24)] text-[var(--color-resolve)]"}`}>
          {msg.type === "err" ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-[10px] font-medium uppercase tracking-widest text-[var(--color-ghost)]">Custom domain</label>
        <div className="flex items-center gap-2">
          <input
            className="input flex-1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="status.yourcompany.com"
            disabled={loading}
          />
          <button className="btn btn-primary text-xs shrink-0" disabled={loading || !input.trim() || input === domain} onClick={saveDomain} type="button">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : domain ? "Update" : "Add domain"}
          </button>
        </div>
      </div>

      {domain && (
        <>
          <div className="rounded-lg border border-[var(--color-rim)] p-3 space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--color-ghost)]">DNS Configuration</p>
            <p className="text-xs text-[var(--color-subtext)]">
              Add a <span className="font-mono font-semibold text-[var(--color-bright)]">CNAME</span> record for your domain:
            </p>
            <div className="grid grid-cols-[80px_1fr] gap-y-1 text-xs font-mono">
              <span className="text-[var(--color-ghost)]">Name</span>
              <span className="text-[var(--color-bright)]">{domain}</span>
              <span className="text-[var(--color-ghost)]">Type</span>
              <span className="text-[var(--color-bright)]">CNAME</span>
              <span className="text-[var(--color-ghost)]">Value</span>
              <span className="text-[var(--color-bright)]">{cnameTarget}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <span className={`inline-block w-2 h-2 rounded-full ${verified ? "bg-[var(--color-resolve)]" : "bg-[var(--color-warning)]"}`} />
              <span style={{ color: verified ? "var(--color-resolve)" : "var(--color-warning)" }}>
                {verified ? "Verified — your status page is live at this domain" : "Pending verification"}
              </span>
            </div>
            <div className="flex gap-2">
              {!verified && (
                <button className="btn btn-ghost !min-h-[32px] text-xs" disabled={checking} onClick={checkVerification} type="button">
                  {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Verify DNS"}
                </button>
              )}
              <button className="btn btn-danger !min-h-[32px] text-xs" disabled={loading} onClick={removeDomain} type="button">
                Remove
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
