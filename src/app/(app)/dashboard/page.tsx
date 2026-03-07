import Link from "next/link";
import { IncidentSeverity, IncidentStatus } from "@prisma/client";
import { CreateIncidentForm } from "@/components/create-incident-form";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getExecutiveDashboard, refreshWorkspaceReadModels } from "@/lib/read-models";

function severityBadgeClass(severity: IncidentSeverity): string {
  if (severity === IncidentSeverity.P1) return "badge badge-p1";
  if (severity === IncidentSeverity.P2) return "badge badge-p2";
  return "badge badge-p3";
}

export default async function DashboardPage() {
  const auth = await requireAuth();

  const [incidents, executive] = await Promise.all([
    prisma.incident.findMany({
      where: { workspaceId: auth.user.workspaceId },
      include: {
        owner: { select: { name: true } },
        _count: { select: { events: true } },
      },
      orderBy: [{ severity: "asc" }, { updatedAt: "desc" }],
      take: 40,
    }),
    getExecutiveDashboard(auth.user.workspaceId),
  ]);

  if (!executive.snapshot) {
    await refreshWorkspaceReadModels(auth.user.workspaceId);
  }

  const executiveData = executive.snapshot
    ? executive
    : await getExecutiveDashboard(auth.user.workspaceId);

  const fallbackCounts = {
    p1: incidents.filter((item) => item.severity === IncidentSeverity.P1).length,
    open: incidents.filter((item) => item.status !== IncidentStatus.RESOLVED).length,
    resolved: incidents.filter((item) => item.status === IncidentStatus.RESOLVED).length,
  };

  const snapshot = executiveData.snapshot;
  const counts = {
    total: incidents.length,
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

      <section className="surface overflow-hidden">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-xl font-semibold">Incident queue</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Events</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((incident) => (
                <tr className="border-t border-slate-100" key={incident.id}>
                  <td className="px-4 py-3">
                    <span className={severityBadgeClass(incident.severity)}>
                      {incident.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link className="font-medium text-teal-800 underline" href={`/incidents/${incident.id}`}>
                      {incident.title}
                    </Link>
                    <p className="mt-1 text-xs text-slate-500">
                      {incident.category ?? "Uncategorized"}
                    </p>
                  </td>
                  <td className="px-4 py-3">{incident.status}</td>
                  <td className="px-4 py-3">{incident.owner?.name ?? "Unassigned"}</td>
                  <td className="px-4 py-3">{incident._count.events}</td>
                  <td className="px-4 py-3">{incident.updatedAt.toLocaleString()}</td>
                </tr>
              ))}

              {incidents.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-slate-500" colSpan={6}>
                    No incidents yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
