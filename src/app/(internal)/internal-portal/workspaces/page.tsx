"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { InternalDataTable } from "@/components/internal/internal-data-table";

type Workspace = Record<string, unknown>;

export default function WorkspacesPage() {
  const router = useRouter();
  const [data, setData] = useState<{ total: number; workspaces: Workspace[] }>({ total: 0, workspaces: [] });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const load = useCallback((p: number, q: string) => {
    const params = new URLSearchParams({ page: String(p), limit: "20" });
    if (q) params.set("search", q);
    fetch(`/api/internal-portal/workspaces?${params}`).then((r) => r.json()).then(setData);
  }, []);

  useEffect(() => { load(page, search); }, [page, search, load]);

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-title)]">Workspaces</h1>
      <div className="mt-6">
        <InternalDataTable
          columns={[
            { key: "name", label: "Name" },
            { key: "slug", label: "Slug" },
            { key: "planTier", label: "Plan" },
            { key: "userCount", label: "Users" },
            { key: "incidentCount", label: "Incidents" },
            { key: "billingStatus", label: "Billing" },
            { key: "blockedAt", label: "Blocked", render: (r) => r.blockedAt ? "🔴" : "" },
            { key: "createdAt", label: "Created", render: (r) => new Date(r.createdAt as string).toLocaleDateString() },
          ]}
          data={data.workspaces}
          total={data.total}
          page={page}
          limit={20}
          searchPlaceholder="Search name, slug, or email..."
          onSearch={(q) => { setSearch(q); setPage(1); }}
          onPageChange={setPage}
          onRowClick={(r) => router.push(`/internal-portal/workspaces/${r.id}`)}
        />
      </div>
    </div>
  );
}
