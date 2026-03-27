import Link from "next/link";
import { ReminderStatus } from "@prisma/client";
import { ExecutiveCharts } from "@/components/executive-charts";
import { RefreshDataButton } from "@/components/refresh-data-button";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getExecutiveDashboard } from "@/lib/read-models";

export default async function ExecutivePage() {
  const auth = await requireAuth();

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setUTCDate(now.getUTCDate() - 7);

  const [dashboard, failedReminders7d] = await Promise.all([
    getExecutiveDashboard(auth.user.workspaceId),
    prisma.reminderJobLog.count({
      where: {
        workspaceId: auth.user.workspaceId,
        status: ReminderStatus.FAILED,
        createdAt: { gte: sevenDaysAgo },
      },
    }),
  ]);

  const snapshot = dashboard.snapshot;

  return (
    <div className="page-stack">
      <section className="page-header section-enter">
        <div className="page-header-main">
          <p className="page-kicker">Executive</p>
          <h1 className="page-title">Reliability and response analytics</h1>
          <p className="page-description">
            Tenant-scoped read models for leadership reviews, responder coverage, and incident velocity.
          </p>
        </div>
        <div className="page-header-actions">
          <Link className="btn btn-ghost btn-sm" href="/api/incidents/export?format=csv">
            Export CSV
          </Link>
          <RefreshDataButton />
        </div>
      </section>

      <section className="settings-section section-enter">
        <div className="settings-section-header">
          <h2 className="settings-section-title">Current operating state</h2>
          <p className="settings-section-description">
            The metrics leadership needs first when a response is active.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <article className="metric-card">
            <p className="metric-label">Open incidents</p>
            <p className="metric-value">{snapshot?.openIncidents ?? 0}</p>
            <p className="metric-meta">Currently active across the workspace</p>
          </article>
          <article className="metric-card metric-card-p1">
            <p className="metric-label">P1 open</p>
            <p className="metric-value">{snapshot?.p1OpenIncidents ?? 0}</p>
            <p className="metric-meta">Highest-severity incidents in flight</p>
          </article>
          <article className="metric-card">
            <p className="metric-label">Created 7d</p>
            <p className="metric-value">{snapshot?.incidentsCreatedLast7d ?? 0}</p>
            <p className="metric-meta">New incidents over the last week</p>
          </article>
          <article className="metric-card">
            <p className="metric-label">Resolved 7d</p>
            <p className="metric-value">{snapshot?.incidentsResolvedLast7d ?? 0}</p>
            <p className="metric-meta">Closed incidents over the last week</p>
          </article>
          <article className="metric-card">
            <p className="metric-label">Failed reminders</p>
            <p className="metric-value">{failedReminders7d}</p>
            <p className="metric-meta">Reminder jobs that failed in seven days</p>
          </article>
        </div>
      </section>

      <section className="settings-section section-enter">
        <div className="settings-section-header">
          <h2 className="settings-section-title">Coverage and timing</h2>
          <p className="settings-section-description">
            Response quality indicators across resolution, triage, and customer communications.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <article className="metric-card">
            <p className="metric-label">Avg resolution</p>
            <p className="metric-value">{snapshot?.avgResolutionHoursLast30d ?? 0}</p>
            <p className="metric-meta">Hours across the last 30 days</p>
          </article>
          <article className="metric-card">
            <p className="metric-label">Triage coverage</p>
            <p className="metric-value">{snapshot?.triageCoveragePct ?? 0}%</p>
            <p className="metric-meta">
              {(snapshot?.triageCoveragePct ?? 0) === 0
                ? "Run AI triage on your first incident to improve this metric."
                : "Incidents with AI-assisted triage"}
            </p>
          </article>
          <article className="metric-card">
            <p className="metric-label">Customer updates</p>
            <p className="metric-value">{snapshot?.customerUpdateCoveragePct ?? 0}%</p>
            <p className="metric-meta">
              {(snapshot?.customerUpdateCoveragePct ?? 0) === 0
                ? "Publish a customer update on an incident to start tracking."
                : "Incidents with outbound customer comms"}
            </p>
          </article>
        </div>
      </section>

      <section className="settings-section section-enter">
        <div className="settings-section-header">
          <h2 className="settings-section-title">14-day analytics trend</h2>
          <p className="settings-section-description">
            Incident volume and severity patterns for weekly review and board-level reporting.
          </p>
        </div>

        <div className="surface p-6">
          <ExecutiveCharts data={dashboard.series} />
        </div>
      </section>
    </div>
  );
}
