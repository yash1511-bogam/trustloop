"use client";

import { useCallback, useEffect, useState } from "react";
import { InternalDataTable } from "@/components/internal/internal-data-table";

type Lead = Record<string, unknown>;

export default function EnterpriseLeadsPage() {
  const [data, setData] = useState<{ total: number; leads: Lead[] }>({ total: 0, leads: [] });
  const [page, setPage] = useState(1);

  const load = useCallback((p: number) => {
    fetch(`/api/_internal/enterprise-leads?page=${p}&limit=20`).then((r) => r.json()).then(setData);
  }, []);

  useEffect(() => { load(page); }, [page, load]);

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-title)]">Enterprise Leads</h1>
      <div className="mt-6">
        <InternalDataTable
          columns={[
            { key: "name", label: "Name" },
            { key: "email", label: "Email" },
            { key: "company", label: "Company" },
            { key: "phone", label: "Phone", render: (r) => (r.phone as string) || "—" },
            { key: "message", label: "Message", render: (r) => <span className="max-w-xs truncate block">{(r.message as string) || "—"}</span> },
            { key: "createdAt", label: "Date", render: (r) => new Date(r.createdAt as string).toLocaleDateString() },
          ]}
          data={data.leads}
          total={data.total}
          page={page}
          limit={20}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
