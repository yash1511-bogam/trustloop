"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { InternalStatCard } from "@/components/internal/internal-stat-card";

export default function RevenuePage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch("/api/_internal/revenue").then((r) => (r.ok ? r.json() : null)).then(setData);
  }, []);

  if (data === null) return <p className="text-sm text-[var(--color-ghost)]">Loading...</p>;
  if (!data) { notFound(); return null; }

  const payments = (data.recentPayments ?? []) as Record<string, unknown>[];
  const promoUsage = (data.promoCodeUsage ?? []) as { code: string; count: number }[];

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-title)]">Revenue</h1>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InternalStatCard label="MRR (cents)" value={data.mrr as number} />
        <InternalStatCard label="Starter" value={(data.revenueByPlan as Record<string, number>)?.starter ?? 0} sub="active subscriptions" />
        <InternalStatCard label="Pro" value={(data.revenueByPlan as Record<string, number>)?.pro ?? 0} sub="active subscriptions" />
        <InternalStatCard label="Enterprise" value={(data.revenueByPlan as Record<string, number>)?.enterprise ?? 0} sub="active subscriptions" />
        <InternalStatCard label="Canceled (30d)" value={data.canceledLast30d as number} />
        <InternalStatCard label="Failed Payments" value={data.failedPayments as number} />
      </div>
      {payments.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-[var(--color-title)]">Recent Payments</h2>
          <div className="mt-2 overflow-x-auto rounded-lg border border-[var(--color-rim)]">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[var(--color-rim)] bg-[#101113]">
                <th className="px-4 py-2 text-left text-xs text-[var(--color-ghost)]">Type</th>
                <th className="px-4 py-2 text-left text-xs text-[var(--color-ghost)]">Amount</th>
                <th className="px-4 py-2 text-left text-xs text-[var(--color-ghost)]">Status</th>
                <th className="px-4 py-2 text-left text-xs text-[var(--color-ghost)]">Date</th>
              </tr></thead>
              <tbody>
                {payments.map((p, i) => (
                  <tr key={i} className="border-b border-[var(--color-rim)]">
                    <td className="px-4 py-2 text-[var(--color-body)]">{String(p.eventType)}</td>
                    <td className="px-4 py-2 text-[var(--color-body)]">{String(p.amount ?? "—")} {p.currency ? String(p.currency) : ""}</td>
                    <td className="px-4 py-2 text-[var(--color-body)]">{String(p.processStatus)}</td>
                    <td className="px-4 py-2 text-[var(--color-ghost)]">{new Date(p.createdAt as string).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {promoUsage.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-[var(--color-title)]">Promo Code Usage</h2>
          <div className="mt-2 flex flex-wrap gap-3">
            {promoUsage.map((p) => (
              <div key={p.code} className="rounded-md border border-[var(--color-rim)] bg-[#101113] px-3 py-2 text-sm">
                <span className="font-mono text-[var(--color-title)]">{p.code}</span>
                <span className="ml-2 text-[var(--color-ghost)]">×{p.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
