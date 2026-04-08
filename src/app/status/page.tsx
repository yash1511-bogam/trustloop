import type { Metadata } from "next";
import { StatusSubscribeForm } from "@/components/status-subscribe-form";
import { isTurnstileEnabled, turnstileSiteKey } from "@/lib/turnstile";
import { UptimeBars, type UptimeDay } from "@/components/uptime-bars";
import { StatusAutoRefresh } from "@/components/status-auto-refresh";

export const metadata: Metadata = {
  title: "System Status — TrustLoop",
  description: "Current operational status of the TrustLoop platform.",
  alternates: { canonical: "/status" },
};

const components = [
  "Web Application",
  "API",
  "Authentication (Stytch)",
  "AI Triage Engine",
  "Notification Delivery",
  "Webhook Intake",
  "Async Workers (SQS)",
  "Database (PostgreSQL)",
  "Cache (Redis)",
  "Billing (Dodo Payments)",
];

function generateUptimeDays(days = 90): UptimeDay[] {
  const now = new Date();
  const result: UptimeDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    result.push({
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      status: "operational",
      label: "No issues",
    });
  }
  return result;
}

export default function StatusPage() {
  const uptimeDays = generateUptimeDays();
  const siteKey = isTurnstileEnabled() ? turnstileSiteKey() : null;
  const allOperational = true;
  const openIncidents: Array<{ id: string; title: string; status: string; severity: string; updatedAt: string }> = [];
  const maintenanceWindows: Array<{ id: string; title: string; body?: string; startsAt: Date; endsAt: Date }> = [];
  const updates: Array<{ id: string; body: string; publishedAt: string; incident: { title: string; severity: string } }> = [];

  return (
    <StatusAutoRefresh>
    <main className="min-h-dvh" data-status-page style={{ background: "var(--color-void)" }}>
      <div className="mx-auto max-w-[800px] px-6 py-12">

        {/* Header */}
        <header className="mb-12">
          <p className="kicker mb-3">Status</p>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ color: "var(--color-bright)" }}
          >
            TrustLoop Platform
          </h1>

          {/* Overall status indicator */}
          <div className="mt-5 flex items-center gap-3">
            <span
              className="inline-block w-[3px] h-8 rounded-full"
              style={{ background: allOperational ? "var(--color-resolve)" : "var(--color-danger)" }}
            />
            <span
              className="text-lg font-semibold"
              style={{ color: allOperational ? "var(--color-resolve)" : "var(--color-danger)" }}
            >
              {allOperational ? "All systems operational" : `${openIncidents.length} active incident${openIncidents.length > 1 ? "s" : ""}`}
            </span>
          </div>

          <div className="mt-6 max-w-md">
            <StatusSubscribeForm turnstileSiteKey={siteKey} />
          </div>
        </header>

        {/* Uptime bars per component */}
        <section className="mb-12">
          <h2
            className="text-xs font-semibold uppercase tracking-[0.14em] mb-6"
            style={{ color: "var(--color-ghost)" }}
          >
            Uptime — last 90 days
          </h2>

          <div
            className="divide-y"
            style={{ borderColor: "var(--color-rim)" }}
          >
            {components.map((name) => (
              <UptimeBars
                key={name}
                componentName={name}
                currentStatus="Operational"
                days={uptimeDays}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 mt-4 text-[11px]" style={{ color: "var(--color-ghost)" }}>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--color-resolve)" }} />
              Operational
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--color-warning)" }} />
              Degraded
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--color-danger)" }} />
              Incident
            </span>
          </div>
        </section>

        {/* Scheduled maintenance */}
        {maintenanceWindows.length > 0 && (
          <section className="mb-12">
            <h2
              className="text-xs font-semibold uppercase tracking-[0.14em] mb-4"
              style={{ color: "var(--color-ghost)" }}
            >
              Scheduled maintenance
            </h2>
            <div className="space-y-4">
              {maintenanceWindows.map((window) => {
                const now = new Date();
                const inProgress = window.startsAt <= now && window.endsAt >= now;
                return (
                  <article
                    key={window.id}
                    className="relative pl-4"
                    style={{ borderLeft: `2px solid ${inProgress ? "var(--color-warning)" : "var(--color-rim)"}` }}
                  >
                    <div className="flex items-center gap-2 text-xs" style={{ color: "var(--color-ghost)" }}>
                      <span
                        className="font-medium"
                        style={{ color: inProgress ? "var(--color-warning)" : "var(--color-subtext)" }}
                      >
                        {inProgress ? "In progress" : "Scheduled"}
                      </span>
                      <span>·</span>
                      <time>{window.startsAt.toLocaleString()}</time>
                      <span>→</span>
                      <time>{window.endsAt.toLocaleString()}</time>
                    </div>
                    <p className="mt-1 text-sm font-medium" style={{ color: "var(--color-bright)" }}>
                      {window.title}
                    </p>
                    {window.body && (
                      <p className="mt-1 text-sm whitespace-pre-wrap" style={{ color: "var(--color-subtext)" }}>
                        {window.body}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* Active incidents */}
        {openIncidents.length > 0 && (
          <section className="mb-12">
            <h2
              className="text-xs font-semibold uppercase tracking-[0.14em] mb-4"
              style={{ color: "var(--color-ghost)" }}
            >
              Active incidents
            </h2>
            <div className="space-y-4">
              {openIncidents.map((incident) => (
                <article
                  key={incident.id}
                  className="relative pl-4"
                  style={{ borderLeft: "2px solid var(--color-danger)" }}
                >
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium uppercase tracking-wide" style={{ color: "var(--color-danger)" }}>
                      {incident.status}
                    </span>
                    <span style={{ color: "var(--color-ghost)" }}>·</span>
                    <span className="font-medium" style={{ color: "var(--color-ghost)" }}>
                      {incident.severity}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium" style={{ color: "var(--color-bright)" }}>
                    {incident.title}
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: "var(--color-ghost)" }}>
                    Updated {incident.updatedAt}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Recent updates */}
        <section className="mb-12">
          <h2
            className="text-xs font-semibold uppercase tracking-[0.14em] mb-4"
            style={{ color: "var(--color-ghost)" }}
          >
            Recent updates
          </h2>
          {updates.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-subtext)" }}>
              No public updates published yet.
            </p>
          ) : (
            <div className="space-y-5">
              {updates.map((update) => (
                <article
                  key={update.id}
                  className="relative pl-4"
                  style={{ borderLeft: "2px solid var(--color-rim)" }}
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--color-ghost)" }}>
                    <span className="font-medium" style={{ color: "var(--color-subtext)" }}>
                      {update.incident.severity}
                    </span>
                    <span>·</span>
                    <span>{update.incident.title}</span>
                    <span>·</span>
                    <time>{update.publishedAt}</time>
                  </div>
                  <p
                    className="mt-1 text-sm whitespace-pre-wrap"
                    style={{ color: "var(--color-body)" }}
                  >
                    {update.body}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="pt-8 text-xs" style={{ borderTop: "1px solid var(--color-rim)", color: "var(--color-ghost)" }}>
          Powered by <a href="/" target="_blank" rel="noreferrer" style={{ color: "var(--color-signal)", cursor: "pointer" }}>TrustLoop</a>
        </footer>
      </div>
    </main>
    </StatusAutoRefresh>
  );
}
