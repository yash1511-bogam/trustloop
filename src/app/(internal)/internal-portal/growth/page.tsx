"use client";

import { useEffect, useState } from "react";
import { InternalStatCard } from "@/components/internal/internal-stat-card";

export default function GrowthPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch("/api/internal-portal/growth").then((r) => r.ok ? r.json() : null).then(setData);
  }, []);

  if (!data) return <p className="text-sm text-[var(--color-ghost)]">Loading...</p>;

  const ea = data.earlyAccess as Record<string, number>;
  const ic = data.inviteCodes as Record<string, number>;
  const su = data.signups as Record<string, unknown>;
  const tr = data.trials as Record<string, number>;
  const pd = data.planDistribution as Record<string, number>;

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-title)]">Growth</h1>

      <h2 className="mt-6 text-sm font-semibold text-[var(--color-title)]">Signup Funnel</h2>
      <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <InternalStatCard label="Early Access" value={ea.total} />
        <InternalStatCard label="Verified" value={ea.verified} />
        <InternalStatCard label="Invite Sent" value={ic.sent} />
        <InternalStatCard label="Invite Used" value={ic.used} />
        <InternalStatCard label="Users" value={su.totalUsers as number} />
        <InternalStatCard label="Workspaces" value={su.totalWorkspaces as number} />
      </div>

      <h2 className="mt-8 text-sm font-semibold text-[var(--color-title)]">Trials</h2>
      <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <InternalStatCard label="Active Trials" value={tr.active} />
        <InternalStatCard label="Expired" value={tr.expired} />
      </div>

      <h2 className="mt-8 text-sm font-semibold text-[var(--color-title)]">Plan Distribution</h2>
      <div className="mt-2 grid grid-cols-3 gap-4">
        {Object.entries(pd).map(([tier, count]) => (
          <InternalStatCard key={tier} label={tier} value={count} />
        ))}
      </div>
    </div>
  );
}
