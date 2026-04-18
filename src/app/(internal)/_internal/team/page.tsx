"use client";

import { useEffect, useState } from "react";

type Member = Record<string, unknown>;

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [form, setForm] = useState({ email: "", name: "", role: "SUPPORT" });
  const [msg, setMsg] = useState("");

  const load = () => fetch("/api/_internal/team").then((r) => r.json()).then((d) => setMembers(d.members ?? []));
  useEffect(() => { load(); }, []);

  const invite = async () => {
    const r = await fetch("/api/_internal/team/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const d = await r.json();
    setMsg(r.ok ? `Invited ${form.email}` : d.error ?? "Error");
    if (r.ok) setForm({ email: "", name: "", role: "SUPPORT" });
    load();
  };

  const revoke = async (id: string) => {
    await fetch(`/api/_internal/team/${id}/revoke`, { method: "POST" });
    load();
  };

  const reinstate = async (id: string) => {
    await fetch(`/api/_internal/team/${id}/reinstate`, { method: "POST" });
    load();
  };

  const changeRole = async (id: string, role: string) => {
    await fetch(`/api/_internal/team/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
    load();
  };

  const statusBadge = (status: string) => {
    if (status === "ACTIVE") return <span className="rounded bg-green-900/30 px-2 py-0.5 text-xs text-green-400">Active</span>;
    if (status === "INVITED") return <span className="rounded bg-yellow-900/30 px-2 py-0.5 text-xs text-yellow-400">Invited</span>;
    return <span className="rounded bg-red-900/30 px-2 py-0.5 text-xs text-red-400">Revoked</span>;
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-title)]">Internal Team</h1>
      {msg && <p className="mt-2 text-sm text-[#d4622b]">{msg}</p>}

      <div className="mt-4 flex flex-wrap gap-3">
        <input placeholder="Email *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded border border-[var(--color-rim)] bg-[#101113] px-3 py-1.5 text-sm text-[var(--color-body)]" />
        <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded border border-[var(--color-rim)] bg-[#101113] px-3 py-1.5 text-sm text-[var(--color-body)]" />
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="rounded border border-[var(--color-rim)] bg-[#101113] px-3 py-1.5 text-sm text-[var(--color-body)]">
          <option value="SUPPORT">Support</option>
          <option value="TECH">Tech</option>
          <option value="MARKETING">Marketing</option>
        </select>
        <button onClick={invite} className="rounded bg-[#d4622b] px-3 py-1.5 text-sm text-white">Send Invite</button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--color-rim)]">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-[var(--color-rim)] bg-[#101113]">
            <th className="px-4 py-2 text-left text-xs text-[var(--color-ghost)]">Email</th>
            <th className="px-4 py-2 text-left text-xs text-[var(--color-ghost)]">Name</th>
            <th className="px-4 py-2 text-left text-xs text-[var(--color-ghost)]">Role</th>
            <th className="px-4 py-2 text-left text-xs text-[var(--color-ghost)]">Status</th>
            <th className="px-4 py-2 text-left text-xs text-[var(--color-ghost)]">Actions</th>
          </tr></thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id as string} className="border-b border-[var(--color-rim)]">
                <td className="px-4 py-2 text-[var(--color-body)]">{m.email as string}</td>
                <td className="px-4 py-2 text-[var(--color-body)]">{(m.name as string) || "—"}</td>
                <td className="px-4 py-2">
                  {m.role === "CEO" ? <span className="text-[var(--color-ghost)]">CEO</span> : (
                    <select value={m.role as string} onChange={(e) => changeRole(m.id as string, e.target.value)}
                      className="rounded border border-[var(--color-rim)] bg-[#0a0b0d] px-2 py-0.5 text-xs text-[var(--color-body)]">
                      <option value="SUPPORT">Support</option>
                      <option value="TECH">Tech</option>
                      <option value="MARKETING">Marketing</option>
                    </select>
                  )}
                </td>
                <td className="px-4 py-2">{statusBadge(m.status as string)}</td>
                <td className="px-4 py-2">
                  {m.role !== "CEO" && m.status === "ACTIVE" && <button onClick={() => revoke(m.id as string)} className="text-xs text-red-400 hover:underline">Revoke</button>}
                  {m.role !== "CEO" && m.status === "INVITED" && <button onClick={() => revoke(m.id as string)} className="text-xs text-red-400 hover:underline">Cancel</button>}
                  {m.role !== "CEO" && m.status === "REVOKED" && <button onClick={() => reinstate(m.id as string)} className="text-xs text-green-400 hover:underline">Reinstate</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
