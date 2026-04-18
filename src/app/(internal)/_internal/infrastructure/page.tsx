"use client";

import { useEffect, useState } from "react";
import { InternalStatCard } from "@/components/internal/internal-stat-card";

export default function InfrastructurePage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch("/api/_internal/infrastructure").then((r) => r.ok ? r.json() : null).then(setData);
  }, []);

  if (!data) return <p className="text-sm text-[var(--color-ghost)]">Loading...</p>;

  const health = data.health as Record<string, boolean>;
  const queues = data.queues as Record<string, unknown>;
  const rj = queues.reminderJobs as Record<string, number>;
  const wd = (data.webhookDeliveries as Record<string, unknown>).last24h as Record<string, number>;
  const ed = (data.emailDelivery as Record<string, unknown>).last24h as Record<string, number>;
  const ps = data.pushSubscriptions as Record<string, number>;
  const aiKeys = (data.aiKeyHealth ?? []) as Record<string, unknown>[];

  const dot = (ok: boolean) => <span className={`inline-block h-3 w-3 rounded-full ${ok ? "bg-green-500" : "bg-red-500"}`} />;

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-title)]">Infrastructure</h1>

      <h2 className="mt-6 text-sm font-semibold text-[var(--color-title)]">System Health</h2>
      <div className="mt-2 flex gap-6">
        <span className="flex items-center gap-2 text-sm text-[var(--color-body)]">{dot(health.database)} Database</span>
        <span className="flex items-center gap-2 text-sm text-[var(--color-body)]">{dot(health.redis)} Redis</span>
        <span className="flex items-center gap-2 text-sm text-[var(--color-body)]">{dot(health.reminderQueueConfigured)} SQS Queue</span>
      </div>

      <h2 className="mt-8 text-sm font-semibold text-[var(--color-title)]">Reminder Queue</h2>
      <div className="mt-2 grid grid-cols-3 gap-4">
        <InternalStatCard label="Queued" value={rj.queued} />
        <InternalStatCard label="Processed" value={rj.processed} />
        <InternalStatCard label="Failed" value={rj.failed} />
      </div>

      <h2 className="mt-8 text-sm font-semibold text-[var(--color-title)]">Webhook Deliveries (24h)</h2>
      <div className="mt-2 grid grid-cols-3 gap-4">
        <InternalStatCard label="Total" value={wd.total} />
        <InternalStatCard label="Succeeded" value={wd.succeeded} />
        <InternalStatCard label="Failed" value={wd.failed} />
      </div>

      <h2 className="mt-8 text-sm font-semibold text-[var(--color-title)]">Email Delivery (24h)</h2>
      <div className="mt-2 grid grid-cols-3 gap-4">
        <InternalStatCard label="Total" value={ed.total} />
        <InternalStatCard label="Sent" value={ed.sent} />
        <InternalStatCard label="Failed" value={ed.failed} />
      </div>

      <h2 className="mt-8 text-sm font-semibold text-[var(--color-title)]">Push Subscriptions</h2>
      <div className="mt-2 grid grid-cols-3 gap-4">
        <InternalStatCard label="Total" value={ps.total} />
        <InternalStatCard label="Active" value={ps.active} />
        <InternalStatCard label="Disabled" value={ps.disabled} />
      </div>

      {aiKeys.length > 0 && (
        <>
          <h2 className="mt-8 text-sm font-semibold text-[var(--color-title)]">AI Key Health</h2>
          <div className="mt-2 overflow-x-auto rounded-lg border border-[var(--color-rim)]">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[var(--color-rim)] bg-[#101113]">
                <th className="px-4 py-2 text-left text-xs text-[var(--color-ghost)]">Workspace</th>
                <th className="px-4 py-2 text-left text-xs text-[var(--color-ghost)]">Provider</th>
                <th className="px-4 py-2 text-left text-xs text-[var(--color-ghost)]">Status</th>
                <th className="px-4 py-2 text-left text-xs text-[var(--color-ghost)]">Last Verified</th>
              </tr></thead>
              <tbody>
                {aiKeys.map((k, i) => (
                  <tr key={i} className="border-b border-[var(--color-rim)]">
                    <td className="px-4 py-2 text-[var(--color-body)]">{k.workspaceName as string}</td>
                    <td className="px-4 py-2 text-[var(--color-body)]">{k.provider as string}</td>
                    <td className="px-4 py-2">{k.healthStatus === "OK" ? <span className="text-green-400">OK</span> : k.healthStatus === "FAILED" ? <span className="text-red-400">Failed</span> : <span className="text-[var(--color-ghost)]">Unknown</span>}</td>
                    <td className="px-4 py-2 text-[var(--color-ghost)]">{k.lastVerifiedAt ? new Date(k.lastVerifiedAt as string).toLocaleDateString() : "Never"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
