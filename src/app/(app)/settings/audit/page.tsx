import { requireAuth } from "@/lib/auth";
import { listAuditLogs } from "@/lib/audit";

export default async function AuditLogPage() {
  const auth = await requireAuth();
  const logs = await listAuditLogs(auth.user.workspaceId, 100);

  return (
    <>
      <h2 className="mb-6 text-2xl font-semibold text-slate-100">Audit Log</h2>
      <p className="mb-4 text-sm text-neutral-500">
        All privileged actions in your workspace are recorded here.
      </p>

      <div className="surface overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-800 text-xs uppercase text-neutral-500">
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Summary</th>
              <th className="px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-neutral-800/50">
                <td className="whitespace-nowrap px-4 py-3 text-neutral-400">
                  {log.createdAt.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {log.actorUser?.name ?? log.actorApiKey?.name ?? "System"}
                </td>
                <td className="px-4 py-3">
                  <span className="badge text-xs">{log.action}</span>
                </td>
                <td className="max-w-xs truncate px-4 py-3 text-neutral-400">
                  {log.summary}
                </td>
                <td className="px-4 py-3 text-neutral-500">{log.ipAddress ?? "-"}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                  No audit log entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
