import Link from "next/link";
import { ReminderStatus } from "@prisma/client";
import { ExecutiveCharts } from "@/components/executive-charts";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getExecutiveDashboard } from "@/lib/read-models";

export default async function ExecutivePage() {
  const auth = await requireAuth();

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setUTCDate(now.getUTCDate() - 7);

  const [dashboard, failedReminders7d] = await Promise.all([
    getExecutiveDashboard(auth.user.workspaceId),
    prisma.reminderJobLog.count({
      where: {
        workspaceId: auth.user.workspaceId,
        status: ReminderStatus.FAILED,
        createdAt: { gte: sevenDaysAgo },
      },
    }),
  ]);

  const snapshot = dashboard.snapshot;

  return (
    <div className="space-y-16 pt-8">
      <section>
        <p className="kicker">Executive visibility</p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-100">Reliability and response analytics</h2>
        <p className="mt-2 max-w-3xl text-sm text-neutral-500">
          Tenant-scoped read models for incident operations, response coverage, and leadership reviews.
        </p>
      </section>

      <section className="pb-10 border-b border-white/5">
        <h3 className="text-xl font-medium text-slate-100 mb-8">Key metrics</h3>
        <div className="grid gap-4 md:grid-cols-5">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-amber-500/80 font-medium">Open incidents</p>
            <p className="text-3xl font-light text-amber-400">{snapshot?.openIncidents ?? 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-red-400/80 font-medium">P1 open</p>
            <p className="text-3xl font-light text-red-400">{snapshot?.p1OpenIncidents ?? 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">Created (7d)</p>
            <p className="text-3xl font-light text-slate-100">{snapshot?.incidentsCreatedLast7d ?? 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-emerald-500/80 font-medium">Resolved (7d)</p>
            <p className="text-3xl font-light text-emerald-400">{snapshot?.incidentsResolvedLast7d ?? 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-red-400/80 font-medium">Failed reminders</p>
            <p className="text-3xl font-light text-red-400">{failedReminders7d}</p>
          </div>
        </div>
      </section>

      <section className="pb-10 border-b border-white/5">
        <h3 className="mb-6 text-xl font-medium text-slate-100">Coverage and timing</h3>
        <div className="grid gap-8 md:grid-cols-3">
          <div className="group relative p-5 rounded-2xl border border-white/5 bg-white/5 transition-colors hover:border-white/10">
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium mb-2">Avg resolution (hrs, 30d)</p>
            <p className="text-3xl font-light text-slate-100">{snapshot?.avgResolutionHoursLast30d ?? 0}</p>
          </div>
          <div className="group relative p-5 rounded-2xl border border-white/5 bg-white/5 transition-colors hover:border-white/10">
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium mb-2">Triage coverage (30d)</p>
            <p className="text-3xl font-light text-slate-100">{snapshot?.triageCoveragePct ?? 0}<span className="text-lg text-neutral-500 ml-1">%</span></p>
          </div>
          <div className="group relative p-5 rounded-2xl border border-white/5 bg-white/5 transition-colors hover:border-white/10">
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium mb-2">Customer updates (30d)</p>
            <p className="text-3xl font-light text-slate-100">{snapshot?.customerUpdateCoveragePct ?? 0}<span className="text-lg text-neutral-500 ml-1">%</span></p>
          </div>
        </div>
      </section>

      <section className="pb-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-medium text-slate-100">14-day analytics trend</h3>
            <p className="text-sm text-neutral-500">Incident volume and severity patterns.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="btn btn-ghost text-xs !min-h-[32px] px-3" href="/api/incidents/export?format=csv">
              Export CSV
            </Link>
            <form action="/api/workspace/refresh-read-models" method="post">
              <button className="btn btn-primary text-xs !min-h-[32px] px-4" type="submit">
                Refresh data
              </button>
            </form>
          </div>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
          <ExecutiveCharts data={dashboard.series} />
        </div>
      </section>
    </div>
  );
}
