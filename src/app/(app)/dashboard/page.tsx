import Link from "next/link";
import { IncidentSeverity, IncidentStatus } from "@prisma/client";
import { CreateIncidentForm } from "@/components/create-incident-form";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function severityBadgeClass(severity: IncidentSeverity): string {
  if (severity === IncidentSeverity.P1) return "badge badge-p1";
  if (severity === IncidentSeverity.P2) return "badge badge-p2";
  return "badge badge-p3";
}

export default async function DashboardPage() {
  const auth = await requireAuth();

  const incidents = await prisma.incident.findMany({
    where: { workspaceId: auth.user.workspaceId },
    include: {
      owner: { select: { name: true } },
      _count: { select: { events: true } },
    },
    orderBy: [{ severity: "asc" }, { updatedAt: "desc" }],
    take: 40,
  });

  const counts = {
    total: incidents.length,
    p1: incidents.filter((item) => item.severity === IncidentSeverity.P1).length,
    open: incidents.filter((item) => item.status !== IncidentStatus.RESOLVED).length,
    resolved: incidents.filter((item) => item.status === IncidentStatus.RESOLVED).length,
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
          <p className="kicker">Resolved</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-700">
            {counts.resolved}
          </p>
        </article>
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
