import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { IncidentSeverity } from "@prisma/client";
import { IncidentActions } from "@/components/incident-actions";
import { requireAuth } from "@/lib/auth";
import { getWorkspacePlanTier } from "@/lib/plan-tier-cache";
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
      postMortem: {
        include: { author: { select: { id: true, name: true } } },
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

  const planTier = await getWorkspacePlanTier(auth.user.workspaceId);

  const aiKeyCount = await prisma.aiProviderKey.count({
    where: { workspaceId: auth.user.workspaceId, isActive: true },
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
              planTier={planTier}
              hasAiKeys={aiKeyCount > 0}
            />
          </section>

          <section className="surface p-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-100">Post-Mortem</h3>
            {incident.postMortem ? (
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className={`badge ${incident.postMortem.status === "PUBLISHED" ? "badge-p3" : ""}`}>
                    {incident.postMortem.status}
                  </span>
                  {incident.postMortem.author ? (
                    <span className="text-xs text-neutral-500">by {incident.postMortem.author.name}</span>
                  ) : null}
                </div>
                <h4 className="mb-2 text-sm font-semibold text-slate-200">{incident.postMortem.title}</h4>
                <div className="prose prose-invert prose-sm max-h-80 overflow-y-auto text-neutral-400">
                  <ReactMarkdown>{incident.postMortem.body}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <p className="text-sm text-neutral-500">
                No post-mortem yet.{" "}
                {aiKeyCount > 0
                  ? "Use the \"Generate Post-Mortem\" action to create one with AI."
                  : <Link className="text-amber-400 hover:underline" href="/settings/ai">Add an AI key</Link>}
              </p>
            )}
          </section>

          <Link className="btn btn-ghost" href="/dashboard">
            Back to dashboard
          </Link>
        </aside>
      </div>
    </>
  );
}
