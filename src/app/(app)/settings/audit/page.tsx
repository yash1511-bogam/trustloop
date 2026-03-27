import { FileText } from "@phosphor-icons/react/dist/ssr";
import { EmptyState } from "@/components/empty-state";
import { requireAuth } from "@/lib/auth";
import { listAuditLogs } from "@/lib/audit";

export default async function AuditLogPage() {
  const auth = await requireAuth();
  const logs = await listAuditLogs(auth.user.workspaceId, 100);

  return (
    <section className="settings-section section-enter">
      <div className="settings-section-header">
        <h2 className="settings-section-title">Audit log</h2>
        <p className="settings-section-description">
          All privileged actions across your workspace are recorded here for review and compliance checks.
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="surface">
          <EmptyState
            icon={FileText}
            title="No audit activity yet."
            description="Privileged workspace actions will appear here as your team configures TrustLoop."
          />
        </div>
      ) : (
        <div className="table-shell overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Summary</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap text-[var(--color-subtext)]">
                    {log.createdAt.toLocaleString()}
                  </td>
                  <td>{log.actorUser?.name ?? log.actorApiKey?.name ?? "System"}</td>
                  <td>
                    <span className="badge badge-sm">{log.action}</span>
                  </td>
                  <td className="max-w-xs truncate text-[var(--color-subtext)]">{log.summary}</td>
                  <td className="text-[var(--color-ghost)]">{log.ipAddress ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
