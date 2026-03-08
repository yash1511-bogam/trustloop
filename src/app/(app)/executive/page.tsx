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
    <div className="space-y-5">
      <section className="surface p-5">
        <h2 className="text-2xl font-semibold">Executive dashboard</h2>
        <p className="mt-1 text-sm text-slate-600">
          Tenant-scoped read models for incident operations and reliability leadership.
        </p>
      </section>

      <section className="grid-cards">
        <article className="metric-card">
          <p className="kicker">Open incidents</p>
          <p className="mt-2 text-3xl font-semibold">{snapshot?.openIncidents ?? 0}</p>
        </article>
        <article className="metric-card">
          <p className="kicker">P1 open</p>
          <p className="mt-2 text-3xl font-semibold text-red-700">
            {snapshot?.p1OpenIncidents ?? 0}
          </p>
        </article>
        <article className="metric-card">
          <p className="kicker">Created (7d)</p>
          <p className="mt-2 text-3xl font-semibold">{snapshot?.incidentsCreatedLast7d ?? 0}</p>
        </article>
        <article className="metric-card">
          <p className="kicker">Resolved (7d)</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-700">
            {snapshot?.incidentsResolvedLast7d ?? 0}
          </p>
        </article>
        <article className="metric-card">
          <p className="kicker">Failed reminders (7d)</p>
          <p className="mt-2 text-3xl font-semibold text-amber-700">{failedReminders7d}</p>
        </article>
      </section>

      <section className="surface p-5">
        <h3 className="mb-3 text-lg font-semibold">Coverage and timing</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <article className="panel-card p-3">
            <p className="kicker">Avg resolution (hrs, 30d)</p>
            <p className="mt-1 text-2xl font-semibold">
              {snapshot?.avgResolutionHoursLast30d ?? 0}
            </p>
          </article>
          <article className="panel-card p-3">
            <p className="kicker">Triage coverage (30d)</p>
            <p className="mt-1 text-2xl font-semibold">{snapshot?.triageCoveragePct ?? 0}%</p>
          </article>
          <article className="panel-card p-3">
            <p className="kicker">Customer update coverage (30d)</p>
            <p className="mt-1 text-2xl font-semibold">
              {snapshot?.customerUpdateCoveragePct ?? 0}%
            </p>
          </article>
        </div>
      </section>

      <section className="surface overflow-hidden">
        <div className="border-b border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold">14-day analytics trend</h3>
            <div className="flex gap-2">
              <Link className="btn btn-ghost" href="/api/incidents/export?format=csv">
                Export CSV
              </Link>
              <form action="/api/workspace/refresh-read-models" method="post">
                <button className="btn btn-primary" type="submit">
                  Refresh now
                </button>
              </form>
            </div>
          </div>
        </div>
        <div className="p-4">
          <ExecutiveCharts data={dashboard.series} />
        </div>
      </section>
    </div>
  );
}
