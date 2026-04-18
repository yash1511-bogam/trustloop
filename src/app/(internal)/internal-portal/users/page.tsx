"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { InternalDataTable } from "@/components/internal/internal-data-table";

type User = Record<string, unknown>;

export default function UsersPage() {
  const router = useRouter();
  const [data, setData] = useState<{ total: number; users: User[] }>({ total: 0, users: [] });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const load = useCallback((p: number, q: string) => {
    const params = new URLSearchParams({ page: String(p), limit: "20" });
    if (q) params.set("search", q);
    fetch(`/api/internal-portal/users?${params}`).then((r) => r.json()).then(setData);
  }, []);

  useEffect(() => { load(page, search); }, [page, search, load]);

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-title)]">Users</h1>
      <div className="mt-6">
        <InternalDataTable
          columns={[
            { key: "name", label: "Name" },
            { key: "email", label: "Email" },
            { key: "role", label: "Role" },
            { key: "workspaceName", label: "Workspace" },
            { key: "workspacePlanTier", label: "Plan" },
            { key: "createdAt", label: "Created", render: (r) => new Date(r.createdAt as string).toLocaleDateString() },
          ]}
          data={data.users}
          total={data.total}
          page={page}
          limit={20}
          searchPlaceholder="Search name or email..."
          onSearch={(q) => { setSearch(q); setPage(1); }}
          onPageChange={setPage}
          onRowClick={(r) => router.push(`/internal-portal/workspaces/${r.workspaceId}`)}
        />
      </div>
    </div>
  );
}
