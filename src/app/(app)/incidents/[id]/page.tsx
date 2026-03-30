import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { IncidentSeverity, IncidentStatus as IncidentStatusEnum } from "@prisma/client";
import { Clock, Warning, Brain, CaretRight } from "@phosphor-icons/react/dist/ssr";
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

  const isP1 = incident.severity === IncidentSeverity.P1;

  return (
    <div className="page-shell page-stack">
      {/* ── Hero ── */}
      <section className={`dash-hero section-enter${isP1 ? " dash-hero-p1" : ""}`}>
        <div className="dash-hero-inner">
          <div className="dash-hero-text">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[var(--color-ghost)] mb-3">
              <Link href="/dashboard" className="hover:text-[var(--color-body)] transition-colors">Dashboard</Link>
              <CaretRight size={10} weight="bold" />
              <Link href="/incidents" className="hover:text-[var(--color-body)] transition-colors">Incidents</Link>
              <CaretRight size={10} weight="bold" />
              <span className="text-[var(--color-subtext)]">{incident.sourceTicketRef ?? incident.id.slice(0, 8)}</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={severityBadgeClass(incident.severity)}>
                {isP1 && <Warning size={12} weight="bold" />}
                {incident.severity}
              </span>
              <span className="badge">
                {incident.status === IncidentStatusEnum.NEW && <Clock size={12} weight="bold" />}
                {incident.status}
              </span>
              {incident.category ? <span className="badge"><Brain size={12} weight="regular" />{incident.category}</span> : null}
            </div>
            <h1 className="page-title" style={{ fontSize: 28 }}>{incident.title}</h1>
            <p className="page-description">{incident.description}</p>
          </div>
        </div>
      </section>

      {/* ── Metadata cards ── */}
      <section className="dash-stats section-enter" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {[
          { label: "Owner", value: incident.owner?.name ?? "Unassigned" },
          { label: "Customer", value: incident.customerName || incident.customerEmail || "Unknown" },
          { label: "Ticket ref", value: incident.sourceTicketRef ?? "—" },
          { label: "Model version", value: incident.modelVersion ?? "—" },
        ].map((m) => (
          <div key={m.label} className="dash-stat-card">
            <div className="dash-stat-label">{m.label}</div>
            <div className="dash-stat-value" style={{ fontSize: 16, fontWeight: 600 }}>{m.value}</div>
          </div>
        ))}
      </section>

      {/* ── Main content ── */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] section-enter">
        {/* Timeline */}
        <div className="dash-chart-card">
          <div className="dash-chart-header">
            <div>
              <h2 className="dash-chart-title">Timeline</h2>
              <p className="dash-chart-desc">{incident.events.length} event{incident.events.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
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
                      {event.actor?.name ? ` · ${event.actor.name}` : ""}
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
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="dash-chart-card">
            <div className="dash-chart-header">
              <div>
                <h2 className="dash-chart-title">Actions</h2>
                <p className="dash-chart-desc">Update status, assign, or run AI</p>
              </div>
            </div>
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
          </div>

          <div className="dash-chart-card">
            <div className="dash-chart-header">
              <div>
                <h2 className="dash-chart-title">Post-Mortem</h2>
              </div>
            </div>
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
              <div className="text-center py-4">
                <p className="text-sm text-[var(--color-ghost)]">No post-mortem yet.</p>
                {aiKeyCount > 0 ? (
                  <p className="mt-2 text-xs text-[var(--color-subtext)]">
                    Use the &quot;Generate Post-Mortem&quot; action above to create one with AI.
                  </p>
                ) : (
                  <Link className="btn btn-ghost btn-sm mt-3 text-[var(--color-warning)]" href="/integrations/ai">
                    Add an AI key to enable generation
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
