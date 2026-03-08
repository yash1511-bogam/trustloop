import Link from "next/link";
import { CreateIncidentForm } from "@/components/create-incident-form";
import { DashboardIncidentQueue } from "@/components/dashboard-incident-queue";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getExecutiveDashboard } from "@/lib/read-models";

export default async function DashboardPage() {
  const auth = await requireAuth();

  const [executiveData, totalIncidents] = await Promise.all([
    getExecutiveDashboard(auth.user.workspaceId),
    prisma.incident.count({
      where: { workspaceId: auth.user.workspaceId },
    }),
  ]);
  const fallbackCounts = {
    p1: 0,
    open: 0,
    resolved: 0,
  };

  const snapshot = executiveData.snapshot;
  const counts = {
    total: totalIncidents,
    p1: snapshot?.p1OpenIncidents ?? fallbackCounts.p1,
    open: snapshot?.openIncidents ?? fallbackCounts.open,
    resolved:
      snapshot?.incidentsResolvedLast7d !== undefined
        ? snapshot.incidentsResolvedLast7d
        : fallbackCounts.resolved,
    created7d: snapshot?.incidentsCreatedLast7d ?? 0,
    avgResolutionHours: snapshot?.avgResolutionHoursLast30d ?? 0,
  };

  return (
    <div className="space-y-5">
      <section className="grid-cards">
        <article className="metric-card">
          <p className="kicker">Total incidents</p>
          <p className="mt-2 text-3xl font-semibold">{counts.total}</p>
        </article>
        <article className="metric-card">
          <p className="kicker">P1 incidents</p>
          <p className="mt-2 text-3xl font-semibold text-red-700">{counts.p1}</p>
        </article>
        <article className="metric-card">
          <p className="kicker">Open</p>
          <p className="mt-2 text-3xl font-semibold">{counts.open}</p>
        </article>
        <article className="metric-card">
          <p className="kicker">Resolved (7d)</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-700">
            {counts.resolved}
          </p>
        </article>
        <article className="metric-card">
          <p className="kicker">Created (7d)</p>
          <p className="mt-2 text-3xl font-semibold">{counts.created7d}</p>
        </article>
        <article className="metric-card">
          <p className="kicker">Avg resolve (hrs, 30d)</p>
          <p className="mt-2 text-3xl font-semibold">{counts.avgResolutionHours}</p>
        </article>
      </section>

      <section className="surface p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold">Executive read models</h2>
            <p className="text-sm text-slate-600">
              Cached analytics snapshot for operations leadership.
            </p>
          </div>
          <Link className="btn btn-ghost" href="/executive">
            Open full executive view
          </Link>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <article className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="kicker">Triage coverage (30d)</p>
            <p className="mt-1 text-2xl font-semibold">
              {snapshot?.triageCoveragePct ?? 0}%
            </p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="kicker">Customer update coverage (30d)</p>
            <p className="mt-1 text-2xl font-semibold">
              {snapshot?.customerUpdateCoveragePct ?? 0}%
            </p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="kicker">Snapshot updated</p>
            <p className="mt-1 text-sm font-medium">
              {snapshot?.updatedAt ? new Date(snapshot.updatedAt).toLocaleString() : "N/A"}
            </p>
          </article>
        </div>
      </section>

      <section className="surface p-5">
        <h2 className="mb-1 text-xl font-semibold">Create incident</h2>
        <p className="mb-4 text-sm text-slate-600">
          Log customer-facing AI failures and kick off ownership immediately.
        </p>
        <CreateIncidentForm />
      </section>

      <DashboardIncidentQueue />
    </div>
  );
}
