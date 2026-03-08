import Link from "next/link";
import { notFound } from "next/navigation";
import { IncidentSeverity } from "@prisma/client";
import { IncidentActions } from "@/components/incident-actions";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function severityBadgeClass(severity: IncidentSeverity): string {
  if (severity === IncidentSeverity.P1) return "badge badge-p1";
  if (severity === IncidentSeverity.P2) return "badge badge-p2";
  return "badge badge-p3";
}

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requireAuth();
  const { id } = await params;

  const incident = await prisma.incident.findFirst({
    where: {
      id,
      workspaceId: auth.user.workspaceId,
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      events: {
        include: {
          actor: {
            select: { name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!incident) {
    notFound();
  }

  const owners = await prisma.user.findMany({
    where: { workspaceId: auth.user.workspaceId },
    select: {
      id: true,
      name: true,
      role: true,
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-5">
      <section className="surface p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className={severityBadgeClass(incident.severity)}>{incident.severity}</span>
          <span className="badge">{incident.status}</span>
          {incident.category ? <span className="badge">{incident.category}</span> : null}
        </div>

        <h2 className="text-2xl font-semibold">{incident.title}</h2>
        <p className="mt-2 whitespace-pre-wrap text-slate-700">{incident.description}</p>

        <div className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
          <p>
            <span className="font-semibold">Owner:</span> {incident.owner?.name ?? "Unassigned"}
          </p>
          <p>
            <span className="font-semibold">Customer:</span>{" "}
            {incident.customerName || incident.customerEmail || "Unknown"}
          </p>
          <p>
            <span className="font-semibold">Ticket ref:</span> {incident.sourceTicketRef ?? "-"}
          </p>
          <p>
            <span className="font-semibold">Model version:</span> {incident.modelVersion ?? "-"}
          </p>
        </div>
      </section>

      <section className="surface p-5">
        <h3 className="mb-3 text-lg font-semibold">Actions</h3>
        <IncidentActions
          incidentId={incident.id}
          status={incident.status}
          severity={incident.severity}
          category={incident.category}
          ownerUserId={incident.ownerUserId}
          owners={owners}
        />
      </section>

      <section className="surface p-5">
        <h3 className="mb-3 text-lg font-semibold">Timeline</h3>
        <div className="space-y-3">
          {incident.events.map((event) => (
            <article className="panel-card p-3" key={event.id}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs text-slate-500">
                <span>
                  {event.eventType}
                  {event.actor?.name ? ` • ${event.actor.name}` : ""}
                </span>
                <span>{event.createdAt.toLocaleString()}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-slate-800">{event.body}</p>
            </article>
          ))}

          {incident.events.length === 0 ? (
            <p className="text-sm text-slate-500">No timeline events yet.</p>
          ) : null}
        </div>
      </section>

      <Link className="btn btn-ghost" href="/dashboard">
        Back to dashboard
      </Link>
    </div>
  );
}
