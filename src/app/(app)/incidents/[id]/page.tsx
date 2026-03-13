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

  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: auth.user.workspaceId },
    select: { planTier: true },
  });

  return (
    <>
      <section className="surface p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className={severityBadgeClass(incident.severity)}>{incident.severity}</span>
          <span className="badge">{incident.status}</span>
          {incident.category ? <span className="badge">{incident.category}</span> : null}
        </div>

        <h2 className="text-3xl font-semibold text-slate-100">{incident.title}</h2>
        <p className="mt-4 max-w-4xl whitespace-pre-wrap leading-relaxed text-neutral-500">{incident.description}</p>

        <div className="mt-6 grid gap-2 text-sm text-neutral-500 md:grid-cols-2">
          <p>
            <span className="font-semibold text-slate-300">Owner:</span> {incident.owner?.name ?? "Unassigned"}
          </p>
          <p>
            <span className="font-semibold text-slate-300">Customer:</span>{" "}
            {incident.customerName || incident.customerEmail || "Unknown"}
          </p>
          <p>
            <span className="font-semibold text-slate-300">Ticket ref:</span> {incident.sourceTicketRef ?? "-"}
          </p>
          <p>
            <span className="font-semibold text-slate-300">Model version:</span> {incident.modelVersion ?? "-"}
          </p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="surface p-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-100">Timeline</h3>
          <div className="space-y-4">
            {incident.events.map((event) => (
              <article className="panel-card p-4" key={event.id}>
                <div className="mb-1 flex items-center justify-between gap-2 text-xs text-neutral-500">
                  <span>
                    {event.eventType}
                    {event.actor?.name ? ` • ${event.actor.name}` : ""}
                  </span>
                  <span>{event.createdAt.toLocaleString()}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-slate-300">{event.body}</p>
              </article>
            ))}

            {incident.events.length === 0 ? (
              <p className="text-sm text-neutral-500">No timeline events yet.</p>
            ) : null}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="surface p-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-100">Actions</h3>
            <IncidentActions
              incidentId={incident.id}
              status={incident.status}
              severity={incident.severity}
              category={incident.category}
              ownerUserId={incident.ownerUserId}
              owners={owners}
              planTier={workspace.planTier ?? "starter"}
            />
          </section>

          <Link className="btn btn-ghost" href="/dashboard">
            Back to dashboard
          </Link>
        </aside>
      </div>
    </>
  );
}
