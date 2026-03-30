import { IncidentStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatusSubscribeForm } from "@/components/status-subscribe-form";
import { isTurnstileEnabled, turnstileSiteKey } from "@/lib/turnstile";
import { UptimeBars, type DayStatus, type UptimeDay } from "@/components/uptime-bars";

function statusLabel(status: IncidentStatus) {
  if (status === IncidentStatus.RESOLVED) return { text: "Resolved", color: "var(--color-resolve)" };
  if (status === IncidentStatus.MITIGATED) return { text: "Mitigated", color: "var(--color-warning)" };
  if (status === IncidentStatus.INVESTIGATING) return { text: "Investigating", color: "var(--color-danger)" };
  return { text: String(status), color: "var(--color-danger)" };
}

function componentHealth(incidents: { status: IncidentStatus }[]): "Operational" | "Degraded" | "Incident" {
  if (incidents.length === 0) return "Operational";
  return incidents.some((i) => i.status !== IncidentStatus.RESOLVED && i.status !== IncidentStatus.MITIGATED) ? "Incident" : "Degraded";
}

function generateUptimeDays(incidents: { status: IncidentStatus; updatedAt: Date }[], days = 90): UptimeDay[] {
  const now = new Date();
  const result: UptimeDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const dayInc = incidents.filter((inc) => inc.updatedAt >= dayStart && inc.updatedAt < dayEnd);
    let status: DayStatus = "operational", label = "No issues";
    if (dayInc.length > 0) {
      const hasActive = dayInc.some((inc) => inc.status !== IncidentStatus.RESOLVED && inc.status !== IncidentStatus.MITIGATED);
      status = hasActive ? "incident" : "degraded";
      label = `${dayInc.length} ${hasActive ? "active" : "resolved"} incident${dayInc.length > 1 ? "s" : ""}`;
    }
    result.push({ date: dateStr, status, label });
  }
  return result;
}

export default async function CustomDomainStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ domain?: string }>;
}) {
  const { domain } = await searchParams;
  if (!domain) notFound();

  const workspace = await prisma.workspace.findFirst({
    where: { customDomain: domain, customDomainVerified: true, statusPageEnabled: true },
    select: { id: true, name: true, slug: true },
  });
  if (!workspace) notFound();

  const now = new Date();
  const siteKey = isTurnstileEnabled() ? turnstileSiteKey() : null;
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);

  const [allIncidents, updates, maintenanceWindows] = await Promise.all([
    prisma.incident.findMany({
      where: { workspaceId: workspace.id, updatedAt: { gte: ninetyDaysAgo } },
      select: { id: true, title: true, status: true, severity: true, category: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.statusUpdate.findMany({
      where: { workspaceId: workspace.id, isVisible: true },
      include: { incident: { select: { title: true, severity: true } } },
      orderBy: { publishedAt: "desc" },
      take: 20,
    }),
    prisma.maintenanceWindow.findMany({
      where: { workspaceId: workspace.id, isVisible: true, endsAt: { gte: new Date(now.getTime() - 86400000) } },
      orderBy: [{ startsAt: "asc" }],
      take: 6,
    }),
  ]);

  const openIncidents = allIncidents.filter((i) => i.status !== IncidentStatus.RESOLVED);
  const componentMap = new Map<string, typeof allIncidents>();
  for (const inc of allIncidents) { const key = inc.category ?? "General"; if (!componentMap.has(key)) componentMap.set(key, []); componentMap.get(key)!.push(inc); }
  for (const c of ["API", "AI Triage", "Webhooks", "Dashboard"]) { if (!componentMap.has(c)) componentMap.set(c, []); }
  const allOperational = openIncidents.length === 0;
  const slug = workspace.slug ?? "";

  return (
    <main className="min-h-dvh" data-status-page style={{ background: "var(--color-void)" }}>
      <div className="mx-auto max-w-[800px] px-6 py-12">
        <header className="mb-12">
          <p className="kicker mb-3">Status</p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--color-bright)" }}>{workspace.name}</h1>
          <div className="mt-5 flex items-center gap-3">
            <span className="inline-block w-[3px] h-8 rounded-full" style={{ background: allOperational ? "var(--color-resolve)" : "var(--color-danger)" }} />
            <span className="text-lg font-semibold" style={{ color: allOperational ? "var(--color-resolve)" : "var(--color-danger)" }}>
              {allOperational ? "All systems operational" : `${openIncidents.length} active incident${openIncidents.length > 1 ? "s" : ""}`}
            </span>
          </div>
          <div className="mt-6 max-w-md">
            <StatusSubscribeForm slug={slug} turnstileSiteKey={siteKey} />
          </div>
        </header>

        <section className="mb-12">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] mb-6" style={{ color: "var(--color-ghost)" }}>Uptime — last 90 days</h2>
          <div className="divide-y" style={{ borderColor: "var(--color-rim)" }}>
            {[...componentMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([name, incidents]) => (
              <UptimeBars key={name} componentName={name} currentStatus={componentHealth(incidents.filter((i) => i.status !== IncidentStatus.RESOLVED))} days={generateUptimeDays(incidents)} />
            ))}
          </div>
          <div className="flex items-center gap-5 mt-4 text-[11px]" style={{ color: "var(--color-ghost)" }}>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--color-resolve)" }} />Operational</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--color-warning)" }} />Degraded</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--color-danger)" }} />Incident</span>
          </div>
        </section>

        {maintenanceWindows.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] mb-4" style={{ color: "var(--color-ghost)" }}>Scheduled maintenance</h2>
            <div className="space-y-4">
              {maintenanceWindows.map((window) => {
                const inProgress = window.startsAt <= now && window.endsAt >= now;
                return (
                  <article key={window.id} className="relative pl-4" style={{ borderLeft: `2px solid ${inProgress ? "var(--color-warning)" : "var(--color-rim)"}` }}>
                    <div className="flex items-center gap-2 text-xs" style={{ color: "var(--color-ghost)" }}>
                      <span className="font-medium" style={{ color: inProgress ? "var(--color-warning)" : "var(--color-subtext)" }}>{inProgress ? "In progress" : "Scheduled"}</span>
                      <span>·</span><time>{window.startsAt.toLocaleString()}</time><span>→</span><time>{window.endsAt.toLocaleString()}</time>
                    </div>
                    <p className="mt-1 text-sm font-medium" style={{ color: "var(--color-bright)" }}>{window.title}</p>
                    {window.body && <p className="mt-1 text-sm whitespace-pre-wrap" style={{ color: "var(--color-subtext)" }}>{window.body}</p>}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {openIncidents.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] mb-4" style={{ color: "var(--color-ghost)" }}>Active incidents</h2>
            <div className="space-y-4">
              {openIncidents.map((incident) => {
                const s = statusLabel(incident.status);
                return (
                  <article key={incident.id} className="relative pl-4" style={{ borderLeft: `2px solid ${s.color}` }}>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium uppercase tracking-wide" style={{ color: s.color }}>{s.text}</span>
                      <span style={{ color: "var(--color-ghost)" }}>·</span>
                      <span className="font-medium" style={{ color: "var(--color-ghost)" }}>{incident.severity}</span>
                    </div>
                    <p className="mt-1 text-sm font-medium" style={{ color: "var(--color-bright)" }}>{incident.title}</p>
                    <p className="mt-0.5 text-xs" style={{ color: "var(--color-ghost)" }}>Updated {incident.updatedAt.toLocaleString()}</p>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        <section className="mb-12">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] mb-4" style={{ color: "var(--color-ghost)" }}>Recent updates</h2>
          {updates.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-subtext)" }}>No public updates published yet.</p>
          ) : (
            <div className="space-y-5">
              {updates.map((update) => (
                <article key={update.id} className="relative pl-4" style={{ borderLeft: "2px solid var(--color-rim)" }}>
                  <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--color-ghost)" }}>
                    <span className="font-medium" style={{ color: "var(--color-subtext)" }}>{update.incident.severity}</span>
                    <span>·</span><span>{update.incident.title}</span><span>·</span><time>{update.publishedAt.toLocaleString()}</time>
                  </div>
                  <p className="mt-1 text-sm whitespace-pre-wrap" style={{ color: "var(--color-body)" }}>{update.body}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="pt-8 text-xs" style={{ borderTop: "1px solid var(--color-rim)", color: "var(--color-ghost)" }}>
          Powered by <span style={{ color: "var(--color-signal)" }}>TrustLoop</span>
        </footer>
      </div>
    </main>
  );
}
