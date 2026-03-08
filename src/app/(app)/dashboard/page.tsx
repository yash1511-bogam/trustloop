import Link from "next/link";
import { Clock3, FileText } from "lucide-react";
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

  const snapshot = executiveData.snapshot;
  const counts = {
    total: totalIncidents,
    p1: snapshot?.p1OpenIncidents ?? 0,
    open: snapshot?.openIncidents ?? 0,
    resolved: snapshot?.incidentsResolvedLast7d ?? 0,
    created7d: snapshot?.incidentsCreatedLast7d ?? 0,
    avgResolutionHours: snapshot?.avgResolutionHoursLast30d ?? 0,
  };

  return (
    <>
      <section className="surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="kicker">Incident operations</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-100">Command dashboard</h2>
            <p className="mt-2 max-w-3xl text-sm text-neutral-500">
              Track incident pressure, ownership, and response quality in one workspace view.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="btn btn-ghost" href="/api/incidents/export?format=csv">
              <FileText className="h-4 w-4" />
              Export incidents
            </Link>
            <Link className="btn btn-primary" href="/executive">
              Open executive view
            </Link>
          </div>
        </div>
      </section>

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
          <p className="mt-2 text-3xl font-semibold text-emerald-700">{counts.resolved}</p>
        </article>
        <article className="metric-card">
          <p className="kicker">Created (7d)</p>
          <p className="mt-2 text-3xl font-semibold">{counts.created7d}</p>
        </article>
        <article className="metric-card">
          <p className="kicker">Avg resolve (hrs)</p>
          <p className="mt-2 text-3xl font-semibold">{counts.avgResolutionHours}</p>
        </article>
      </section>

      <section className="surface p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-100">Executive read-model snapshot</h3>
            <p className="text-sm text-neutral-500">Cached analytics summary for leadership.</p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
            <Clock3 className="h-3.5 w-3.5" />
            {snapshot?.updatedAt ? new Date(snapshot.updatedAt).toLocaleString() : "No snapshot yet"}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <article className="panel-card p-4">
            <p className="kicker">Triage coverage (30d)</p>
            <p className="mt-1 text-2xl font-semibold">{snapshot?.triageCoveragePct ?? 0}%</p>
          </article>
          <article className="panel-card p-4">
            <p className="kicker">Customer update coverage (30d)</p>
            <p className="mt-1 text-2xl font-semibold">{snapshot?.customerUpdateCoveragePct ?? 0}%</p>
          </article>
          <article className="panel-card p-4">
            <p className="kicker">P1 currently open</p>
            <p className="mt-1 text-2xl font-semibold text-red-700">{snapshot?.p1OpenIncidents ?? 0}</p>
          </article>
        </div>
      </section>

      <section className="surface p-6">
        <h3 className="mb-1 text-xl font-semibold text-slate-100">Create incident</h3>
        <p className="mb-4 text-sm text-neutral-500">
          Log customer-facing AI failures and trigger ownership immediately.
        </p>
        <CreateIncidentForm />
      </section>

      <DashboardIncidentQueue />
    </>
  );
}
