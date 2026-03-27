import { IncidentStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatusSubscribeForm } from "@/components/status-subscribe-form";
import { isTurnstileEnabled, turnstileSiteKey } from "@/lib/turnstile";

function statusTone(status: IncidentStatus): string {
  if (status === IncidentStatus.RESOLVED) return "badge";
  if (status === IncidentStatus.MITIGATED) return "badge badge-p3";
  if (status === IncidentStatus.INVESTIGATING) return "badge badge-p2";
  return "badge badge-p1";
}

function componentHealth(incidents: { status: IncidentStatus }[]): { label: string; className: string } {
  if (incidents.length === 0) return { label: "Operational", className: "text-[var(--color-resolve)]" };
  const hasActive = incidents.some((i) => i.status !== IncidentStatus.RESOLVED && i.status !== IncidentStatus.MITIGATED);
  if (hasActive) return { label: "Degraded", className: "text-[var(--color-danger)]" };
  return { label: "Recovering", className: "text-[var(--color-warning)]" };
}

export default async function PublicStatusPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const now = new Date();
  const siteKey = isTurnstileEnabled() ? turnstileSiteKey() : null;

  const workspace = await prisma.workspace.findFirst({
    where: { slug, statusPageEnabled: true },
    select: { id: true, name: true },
  });

  if (!workspace) notFound();

  const [openIncidents, updates, maintenanceWindows] = await Promise.all([
    prisma.incident.findMany({
      where: { workspaceId: workspace.id, status: { not: IncidentStatus.RESOLVED } },
      select: { id: true, title: true, status: true, severity: true, category: true, updatedAt: true },
      orderBy: [{ severity: "asc" }, { updatedAt: "desc" }],
      take: 20,
    }),
    prisma.statusUpdate.findMany({
      where: { workspaceId: workspace.id, isVisible: true },
      include: { incident: { select: { title: true, severity: true } } },
      orderBy: { publishedAt: "desc" },
      take: 80,
    }),
    prisma.maintenanceWindow.findMany({
      where: {
        workspaceId: workspace.id,
        isVisible: true,
        endsAt: {
          gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        },
      },
      orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
      take: 6,
    }),
  ]);

  // Group incidents by category for component-level status
  const components = new Map<string, typeof openIncidents>();
  for (const inc of openIncidents) {
    const key = inc.category ?? "General";
    if (!components.has(key)) components.set(key, []);
    components.get(key)!.push(inc);
  }
  const defaultComponents = ["API", "AI Triage", "Webhooks", "Dashboard"];
  for (const c of defaultComponents) {
    if (!components.has(c)) components.set(c, []);
  }

  return (
    <main className="container-shell py-8">
      <section className="surface p-6">
        <p className="kicker">Public status</p>
        <h1 className="mt-2 text-3xl font-bold text-[var(--color-bright)]">{workspace.name}</h1>
        <p className="mt-2 text-sm text-[var(--color-subtext)]">Customer-facing incident communication stream.</p>
        <div className="mt-4">
          <StatusSubscribeForm slug={slug} turnstileSiteKey={siteKey} />
        </div>
      </section>

      <section className="surface mt-4 p-6">
        <h2 className="text-xl font-semibold">System status</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[...components.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([name, incidents]) => {
            const health = componentHealth(incidents);
            return (
              <div key={name} className="panel-card flex items-center justify-between p-3">
                <span className="text-sm font-medium text-[var(--color-bright)]">{name}</span>
                <span className={`text-xs font-medium ${health.className}`}>{health.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="surface mt-4 p-6">
        <h2 className="text-xl font-semibold">Scheduled maintenance</h2>
        <div className="mt-4 space-y-3">
          {maintenanceWindows.map((window) => {
            const inProgress =
              window.startsAt.getTime() <= now.getTime() &&
              window.endsAt.getTime() >= now.getTime();
            return (
              <article className="panel-card p-4" key={window.id}>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-ghost)]">
                  <span className={inProgress ? "badge badge-p2" : "badge"}>
                    {inProgress ? "In progress" : "Scheduled"}
                  </span>
                  <time>{window.startsAt.toLocaleString()}</time>
                  <span>→</span>
                  <time>{window.endsAt.toLocaleString()}</time>
                </div>
                <p className="mt-2 font-semibold text-[var(--color-bright)]">{window.title}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-body)]">{window.body}</p>
              </article>
            );
          })}
          {maintenanceWindows.length === 0 ? (
            <p className="text-sm text-[var(--color-subtext)]">No scheduled maintenance windows.</p>
          ) : null}
        </div>
      </section>

      <section className="surface mt-4 p-6">
        <h2 className="text-xl font-semibold">Current incidents</h2>
        <div className="mt-4 space-y-2">
          {openIncidents.map((incident) => (
            <article className="panel-card p-4" key={incident.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge">{incident.severity}</span>
                <span className={statusTone(incident.status)}>{incident.status}</span>
              </div>
              <p className="mt-2 font-semibold">{incident.title}</p>
              <p className="text-xs text-[var(--color-ghost)]">Updated {incident.updatedAt.toLocaleString()}</p>
            </article>
          ))}
          {openIncidents.length === 0 ? <p className="text-sm text-[var(--color-subtext)]">No active incidents.</p> : null}
        </div>
      </section>

      <section className="surface mt-4 p-6">
        <h2 className="text-xl font-semibold">Published updates</h2>
        <div className="mt-4 space-y-4">
          {updates.map((update) => (
            <article className="panel-card p-4" key={update.id}>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[var(--color-ghost)]">
                <span className="badge">{update.incident.severity}</span>
                <span>{update.incident.title}</span>
                <span>•</span>
                <time>{update.publishedAt.toLocaleString()}</time>
              </div>
              <p className="whitespace-pre-wrap text-sm text-[var(--color-bright)]">{update.body}</p>
            </article>
          ))}
          {updates.length === 0 ? (
            <p className="text-sm text-[var(--color-subtext)]">No public updates published yet.</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
