import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { IncidentSeverity, IncidentStatus as IncidentStatusEnum } from "@prisma/client";
import { Clock, Warning, Brain } from "@phosphor-icons/react/dist/ssr";
import { IncidentActions } from "@/components/incident-actions";
import { requireAuth } from "@/lib/auth";
import { getWorkspacePlanTier } from "@/lib/plan-tier-cache";
import { prisma } from "@/lib/prisma";

function severityBadgeClass(severity: IncidentSeverity): string {
  if (severity === IncidentSeverity.P1) return "badge badge-p1";
  if (severity === IncidentSeverity.P2) return "badge badge-p2";
  return "badge badge-p3";
}

function timelineEventColor(eventType: string): string {
  if (eventType === "NOTE") return "var(--color-info)";
  if (eventType.includes("STATUS")) return "var(--color-signal)";
  return "var(--color-ghost)";
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
      <section className="surface section-enter p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className={severityBadgeClass(incident.severity)}>
            {incident.severity === IncidentSeverity.P1 && <Warning size={12} weight="bold" />}
            {incident.severity}
          </span>
          <span className="badge">
            {incident.status === IncidentStatusEnum.NEW && <Clock size={12} weight="bold" />}
            {incident.status}
          </span>
          {incident.category ? <span className="badge"><Brain size={12} weight="regular" />{incident.category}</span> : null}
        </div>

        <h2 className="font-[var(--font-heading)] text-[28px] font-bold text-[var(--color-title)]">{incident.title}</h2>
        <p className="mt-4 max-w-4xl whitespace-pre-wrap leading-relaxed text-[var(--color-ghost)]">{incident.description}</p>

        <div className="mt-6 grid gap-3 text-sm md:grid-cols-2">
          <p>
            <span className="text-[var(--color-subtext)]">Owner</span>
            <span className="ml-3 text-[var(--color-title)]">{incident.owner?.name ?? "Unassigned"}</span>
          </p>
          <p>
            <span className="text-[var(--color-subtext)]">Customer</span>
            <span className="ml-3 text-[var(--color-title)]">{incident.customerName || incident.customerEmail || "Unknown"}</span>
          </p>
          <p>
            <span className="text-[var(--color-subtext)]">Ticket ref</span>
            <span className="ml-3 text-[var(--color-title)]">{incident.sourceTicketRef ?? "-"}</span>
          </p>
          <p>
            <span className="text-[var(--color-subtext)]">Model version</span>
            <span className="ml-3 text-[var(--color-title)]">{incident.modelVersion ?? "-"}</span>
          </p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="surface p-6">
          <h3 className="mb-4 font-[var(--font-heading)] text-[18px] font-semibold text-[var(--color-title)]">Timeline</h3>
          <div className="relative space-y-0">
            {incident.events.length > 1 && (
              <div aria-hidden className="absolute left-[9px] top-4 bottom-4 w-px bg-[var(--color-rim)]" />
            )}
            {incident.events.map((event) => (
              <article className="relative flex gap-4 py-3" key={event.id}>
                <div className="relative z-10 mt-1 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: timelineEventColor(event.eventType) }} />
                </div>
                <div className="min-w-0 flex-1 rounded-[var(--radius-sm)] border border-[var(--color-rim)] bg-[var(--color-void)] p-4">
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs text-[var(--color-ghost)]">
                    <span>
                      {event.eventType}
                      {event.actor?.name ? ` • ${event.actor.name}` : ""}
                    </span>
                    <span>{event.createdAt.toLocaleString()}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-[var(--color-body)]">{event.body}</p>
                </div>
              </article>
            ))}

            {incident.events.length === 0 ? (
              <p className="text-sm text-[var(--color-ghost)]">No timeline events yet.</p>
            ) : null}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="surface p-6">
            <h3 className="mb-4 font-[var(--font-heading)] text-[18px] font-semibold text-[var(--color-title)]">Actions</h3>
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
            <h3 className="mb-4 font-[var(--font-heading)] text-[18px] font-semibold text-[var(--color-title)]">Post-Mortem</h3>
            {incident.postMortem ? (
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className={`badge ${incident.postMortem.status === "PUBLISHED" ? "badge-p3" : ""}`}>
                    {incident.postMortem.status}
                  </span>
                  {incident.postMortem.author ? (
                    <span className="text-xs text-[var(--color-ghost)]">by {incident.postMortem.author.name}</span>
                  ) : null}
                </div>
                <h4 className="mb-2 text-sm font-semibold text-[var(--color-body)]">{incident.postMortem.title}</h4>
                <div className="prose prose-invert prose-sm max-h-80 overflow-y-auto text-[var(--color-subtext)]">
                  <ReactMarkdown>{incident.postMortem.body}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm text-[var(--color-ghost)]">No post-mortem yet.</p>
                {aiKeyCount > 0 ? (
                  <p className="mt-2 text-xs text-[var(--color-subtext)]">
                    Use the &quot;Generate Post-Mortem&quot; action above to create one with AI.
                  </p>
                ) : (
                  <Link className="btn btn-ghost btn-sm mt-3 text-[var(--color-warning)]" href="/settings/ai">
                    Add an AI key to enable generation
                  </Link>
                )}
              </div>
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
