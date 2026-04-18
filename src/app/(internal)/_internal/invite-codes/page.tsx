"use client";

import { useCallback, useEffect, useState } from "react";
import { InternalDataTable } from "@/components/internal/internal-data-table";

type Code = Record<string, unknown>;

export default function InviteCodesPage() {
  const [data, setData] = useState<{ total: number; codes: Code[] }>({ total: 0, codes: [] });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [email, setEmail] = useState("");
  const [bulkCount, setBulkCount] = useState(5);
  const [msg, setMsg] = useState("");

  const load = useCallback((p: number, q: string) => {
    const params = new URLSearchParams({ page: String(p), limit: "20" });
    if (q) params.set("search", q);
    fetch(`/api/_internal/invite-codes?${params}`).then((r) => r.json()).then(setData);
  }, []);

  useEffect(() => { load(page, search); }, [page, search, load]);

  const create = async (body: unknown) => {
    const r = await fetch("/api/_internal/invite-codes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (r.ok) { setMsg("Created!"); load(page, search); } else setMsg("Error");
  };

  const send = async (code: string) => {
    const r = await fetch("/api/_internal/invite-codes/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    setMsg(r.ok ? "Sent!" : "Error");
    load(page, search);
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-title)]">Invite Codes</h1>
      {msg && <p className="mt-2 text-sm text-[#d4622b]">{msg}</p>}

      <div className="mt-4 flex flex-wrap gap-4">
        <div className="flex gap-2">
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded border border-[var(--color-rim)] bg-[#101113] px-3 py-1.5 text-sm text-[var(--color-body)]" />
          <button onClick={() => email && create({ email })} className="rounded bg-[#d4622b] px-3 py-1.5 text-sm text-white">Create for Email</button>
        </div>
        <div className="flex gap-2">
          <input type="number" min={1} max={50} value={bulkCount} onChange={(e) => setBulkCount(Number(e.target.value))} className="w-20 rounded border border-[var(--color-rim)] bg-[#101113] px-3 py-1.5 text-sm text-[var(--color-body)]" />
          <button onClick={() => create({ count: bulkCount })} className="rounded bg-[#17181c] px-3 py-1.5 text-sm text-[var(--color-body)] border border-[var(--color-rim)]">Bulk Generate</button>
        </div>
      </div>

      <div className="mt-6">
        <InternalDataTable
          columns={[
            { key: "code", label: "Code", render: (r) => <span className="font-mono">{r.code as string}</span> },
            { key: "email", label: "Email", render: (r) => (r.email as string) || "—" },
            { key: "used", label: "Used", render: (r) => r.used ? "✅" : "—" },
            { key: "inviteSentAt", label: "Sent", render: (r) => r.inviteSentAt ? new Date(r.inviteSentAt as string).toLocaleDateString() : "—" },
            { key: "createdAt", label: "Created", render: (r) => new Date(r.createdAt as string).toLocaleDateString() },
            { key: "actions", label: "", render: (r) => !r.used && r.email ? <button onClick={() => send(r.code as string)} className="text-xs text-[#d4622b] hover:underline">Send</button> : null },
          ]}
          data={data.codes}
          total={data.total}
          page={page}
          limit={20}
          searchPlaceholder="Search code or email..."
          onSearch={(q) => { setSearch(q); setPage(1); }}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
