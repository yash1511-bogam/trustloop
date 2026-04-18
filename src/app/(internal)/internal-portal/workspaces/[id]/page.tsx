"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { InternalConfirmDialog } from "@/components/internal/internal-confirm-dialog";

export default function WorkspaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ws, setWs] = useState<Record<string, unknown> | null>(null);
  const [dialog, setDialog] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [plan, setPlan] = useState("");

  useEffect(() => {
    fetch(`/api/internal-portal/workspaces/${id}`).then((r) => r.ok ? r.json() : null).then(setWs);
  }, [id]);

  if (!ws) return <p className="text-sm text-[var(--color-ghost)]">Loading...</p>;

  const act = async (url: string, method: string, body?: unknown) => {
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (r.ok) { setDialog(null); router.refresh(); fetch(`/api/internal-portal/workspaces/${id}`).then((r2) => r2.json()).then(setWs); }
  };

  const users = (ws.users ?? []) as Record<string, unknown>[];
  const incidents = (ws.incidents ?? []) as Record<string, unknown>[];

  return (
    <div>
      <button onClick={() => router.push("/internal-portal/workspaces")} className="text-sm text-[#d4622b] hover:underline">← Back</button>
      <div className="mt-4 flex items-center gap-3">
        <h1 className="text-xl font-bold text-[var(--color-title)]">{ws.name as string}</h1>
        <span className="rounded bg-[#17181c] px-2 py-0.5 text-xs text-[var(--color-ghost)]">{ws.planTier as string}</span>
        {Boolean(ws.blockedAt) && <span className="rounded bg-red-900/30 px-2 py-0.5 text-xs text-red-400">Blocked</span>}
      </div>
      <p className="mt-1 text-sm text-[var(--color-ghost)]">Slug: {ws.slug as string ?? "—"} · Created: {new Date(ws.createdAt as string).toLocaleDateString()}</p>

      {/* CEO Actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        <select value={plan} onChange={(e) => setPlan(e.target.value)} className="rounded border border-[var(--color-rim)] bg-[#101113] px-2 py-1 text-sm text-[var(--color-body)]">
          <option value="">Change Plan...</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
        {plan && <button onClick={() => setDialog("upgrade")} className="rounded bg-[#d4622b] px-3 py-1 text-sm text-white">Apply</button>}
        {!ws.blockedAt && <button onClick={() => setDialog("block")} className="rounded border border-red-600 px-3 py-1 text-sm text-red-400">Block</button>}
        {Boolean(ws.blockedAt) && <button onClick={() => act(`/api/internal-portal/workspaces/${id}/unblock`, "POST")} className="rounded border border-green-600 px-3 py-1 text-sm text-green-400">Unblock</button>}
        <button onClick={() => setDialog("delete")} className="rounded border border-red-800 px-3 py-1 text-sm text-red-600">Delete</button>
      </div>

      {/* Users */}
      {users.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-[var(--color-title)]">Users ({users.length})</h2>
          <div className="mt-2 overflow-x-auto rounded-lg border border-[var(--color-rim)]">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[var(--color-rim)] bg-[#101113]">
                <th className="px-4 py-2 text-left text-xs text-[var(--color-ghost)]">Name</th>
                <th className="px-4 py-2 text-left text-xs text-[var(--color-ghost)]">Email</th>
                <th className="px-4 py-2 text-left text-xs text-[var(--color-ghost)]">Role</th>
              </tr></thead>
              <tbody>{users.map((u, i) => (
                <tr key={i} className="border-b border-[var(--color-rim)]">
                  <td className="px-4 py-2 text-[var(--color-body)]">{u.name as string}</td>
                  <td className="px-4 py-2 text-[var(--color-body)]">{u.email as string}</td>
                  <td className="px-4 py-2 text-[var(--color-ghost)]">{u.role as string}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* Incidents */}
      {incidents.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-[var(--color-title)]">Recent Incidents ({incidents.length})</h2>
          <div className="mt-2 overflow-x-auto rounded-lg border border-[var(--color-rim)]">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[var(--color-rim)] bg-[#101113]">
                <th className="px-4 py-2 text-left text-xs text-[var(--color-ghost)]">Title</th>
                <th className="px-4 py-2 text-left text-xs text-[var(--color-ghost)]">Status</th>
                <th className="px-4 py-2 text-left text-xs text-[var(--color-ghost)]">Severity</th>
                <th className="px-4 py-2 text-left text-xs text-[var(--color-ghost)]">SLA</th>
              </tr></thead>
              <tbody>{incidents.map((inc, i) => (
                <tr key={i} className="border-b border-[var(--color-rim)]">
                  <td className="px-4 py-2 text-[var(--color-body)]">{inc.title as string}</td>
                  <td className="px-4 py-2 text-[var(--color-ghost)]">{inc.status as string}</td>
                  <td className="px-4 py-2 text-[var(--color-ghost)]">{inc.severity as string}</td>
                  <td className="px-4 py-2 text-[var(--color-ghost)]">{inc.slaState as string}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialogs */}
      {dialog === "block" && (
        <InternalConfirmDialog title="Block Workspace" description="This will immediately prevent all users from accessing this workspace."
          confirmLabel="Block" destructive
          onCancel={() => setDialog(null)}
          onConfirm={() => { if (reason) act(`/api/internal-portal/workspaces/${id}/block`, "POST", { reason }); }}>
          <input placeholder="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)}
            className="mt-2 w-full rounded border border-[var(--color-rim)] bg-[#0a0b0d] px-3 py-2 text-sm text-[var(--color-body)]" />
        </InternalConfirmDialog>
      )}
      {dialog === "upgrade" && (
        <InternalConfirmDialog title={`Change plan to ${plan}`} description={`This will immediately change the workspace plan to ${plan} and update all quotas.`}
          confirmLabel="Change Plan" onCancel={() => setDialog(null)}
          onConfirm={() => act(`/api/internal-portal/workspaces/${id}/upgrade`, "POST", { plan })} />
      )}
      {dialog === "delete" && (
        <InternalConfirmDialog title="Delete Workspace" description="This permanently deletes the workspace and all its data. Users will be rehomed or deleted."
          confirmLabel="Delete Forever" destructive confirmTypeName={ws.name as string}
          onCancel={() => setDialog(null)}
          onConfirm={() => act(`/api/internal-portal/workspaces/${id}/delete`, "DELETE").then(() => router.push("/internal-portal/workspaces"))} />
      )}
    </div>
  );
}
