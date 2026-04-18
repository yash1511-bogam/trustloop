"use client";

import { useCallback, useEffect, useState } from "react";
import { InternalDataTable } from "@/components/internal/internal-data-table";

type Log = Record<string, unknown>;

export default function AuditPage() {
  const [data, setData] = useState<{ total: number; logs: Log[] }>({ total: 0, logs: [] });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const load = useCallback((p: number, q: string) => {
    const params = new URLSearchParams({ page: String(p), limit: "50" });
    if (q) params.set("action", q);
    fetch(`/api/_internal/audit-logs?${params}`).then((r) => r.json()).then(setData);
  }, []);

  useEffect(() => { load(page, search); }, [page, search, load]);

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-title)]">Audit Log</h1>
      <div className="mt-6">
        <InternalDataTable
          columns={[
            { key: "createdAt", label: "Time", render: (r) => new Date(r.createdAt as string).toLocaleString() },
            { key: "workspaceName", label: "Workspace" },
            { key: "actor", label: "Actor", render: (r) => {
              const a = r.actor as Record<string, string> | null;
              return a ? (a.type === "user" ? a.email : `API: ${a.keyPrefix}`) : "—";
            }},
            { key: "action", label: "Action" },
            { key: "summary", label: "Summary", render: (r) => <span className="max-w-xs truncate block">{r.summary as string}</span> },
          ]}
          data={data.logs}
          total={data.total}
          page={page}
          limit={50}
          searchPlaceholder="Filter by action..."
          onSearch={(q) => { setSearch(q); setPage(1); }}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
