"use client";

import { useEffect, useState } from "react";

type PromoCode = Record<string, unknown>;

export default function PromoCodesPage() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [form, setForm] = useState({ code: "", description: "", discountPercent: "", discountAmount: "", maxUses: "", validUntil: "" });
  const [msg, setMsg] = useState("");

  const load = () => fetch("/api/internal-portal/promo-codes").then((r) => r.json()).then((d) => setCodes(d.codes ?? []));
  useEffect(() => { load(); }, []);

  const create = async () => {
    const body: Record<string, unknown> = { code: form.code, description: form.description || undefined };
    if (form.discountPercent) body.discountPercent = Number(form.discountPercent);
    if (form.discountAmount) body.discountAmount = Number(form.discountAmount);
    if (form.maxUses) body.maxUses = Number(form.maxUses);
    if (form.validUntil) body.validUntil = form.validUntil;
    const r = await fetch("/api/internal-portal/promo-codes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setMsg(r.ok ? "Created!" : "Error");
    load();
  };

  const toggle = async (id: string, isActive: boolean) => {
    await fetch(`/api/internal-portal/promo-codes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !isActive }) });
    load();
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-title)]">Promo Codes</h1>
      {msg && <p className="mt-2 text-sm text-[#d4622b]">{msg}</p>}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <input placeholder="Code *" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="rounded border border-[var(--color-rim)] bg-[#101113] px-3 py-1.5 text-sm text-[var(--color-body)]" />
        <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded border border-[var(--color-rim)] bg-[#101113] px-3 py-1.5 text-sm text-[var(--color-body)]" />
        <input placeholder="% off" type="number" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} className="rounded border border-[var(--color-rim)] bg-[#101113] px-3 py-1.5 text-sm text-[var(--color-body)]" />
        <input placeholder="¢ off" type="number" value={form.discountAmount} onChange={(e) => setForm({ ...form, discountAmount: e.target.value })} className="rounded border border-[var(--color-rim)] bg-[#101113] px-3 py-1.5 text-sm text-[var(--color-body)]" />
        <input placeholder="Max uses" type="number" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} className="rounded border border-[var(--color-rim)] bg-[#101113] px-3 py-1.5 text-sm text-[var(--color-body)]" />
        <button onClick={create} className="rounded bg-[#d4622b] px-3 py-1.5 text-sm text-white">Create</button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--color-rim)]">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-[var(--color-rim)] bg-[#101113]">
            <th className="px-4 py-2 text-left text-xs text-[var(--color-ghost)]">Code</th>
            <th className="px-4 py-2 text-left text-xs text-[var(--color-ghost)]">Discount</th>
            <th className="px-4 py-2 text-left text-xs text-[var(--color-ghost)]">Used</th>
            <th className="px-4 py-2 text-left text-xs text-[var(--color-ghost)]">Max</th>
            <th className="px-4 py-2 text-left text-xs text-[var(--color-ghost)]">Active</th>
            <th className="px-4 py-2 text-left text-xs text-[var(--color-ghost)]">Action</th>
          </tr></thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.id as string} className="border-b border-[var(--color-rim)]">
                <td className="px-4 py-2 font-mono text-[var(--color-title)]">{c.code as string}</td>
                <td className="px-4 py-2 text-[var(--color-body)]">{c.discountPercent ? `${c.discountPercent}%` : c.discountAmount ? `${c.discountAmount}¢` : "—"}</td>
                <td className="px-4 py-2 text-[var(--color-ghost)]">{c.usedCount as number}</td>
                <td className="px-4 py-2 text-[var(--color-ghost)]">{(c.maxUses as number) ?? "∞"}</td>
                <td className="px-4 py-2">{c.isActive ? <span className="text-green-400">Yes</span> : <span className="text-red-400">No</span>}</td>
                <td className="px-4 py-2"><button onClick={() => toggle(c.id as string, c.isActive as boolean)} className="text-xs text-[#d4622b] hover:underline">{c.isActive ? "Deactivate" : "Activate"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
