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

  const operatingStats = [
    { label: "Open incidents", value: snapshot?.openIncidents ?? 0, sub: "Currently active across the workspace" },
    { label: "P1 open", value: snapshot?.p1OpenIncidents ?? 0, sub: "Highest-severity incidents in flight", highlight: true },
    { label: "Created (7d)", value: snapshot?.incidentsCreatedLast7d ?? 0, sub: "New incidents over the last week" },
    { label: "Resolved (7d)", value: snapshot?.incidentsResolvedLast7d ?? 0, sub: "Closed incidents over the last week" },
    { label: "Failed reminders", value: failedReminders7d, sub: "Reminder jobs that failed in seven days" },
  ];

  const coverageStats = [
    { label: "Avg resolution", value: `${snapshot?.avgResolutionHoursLast30d ?? 0}h`, sub: "Hours across the last 30 days" },
    {
      label: "Triage coverage",
      value: `${snapshot?.triageCoveragePct ?? 0}%`,
      sub: (snapshot?.triageCoveragePct ?? 0) === 0
        ? "Run AI triage on your first incident to improve this metric."
        : "Incidents with AI-assisted triage",
    },
    {
      label: "Customer updates",
      value: `${snapshot?.customerUpdateCoveragePct ?? 0}%`,
      sub: (snapshot?.customerUpdateCoveragePct ?? 0) === 0
        ? "Publish a customer update on an incident to start tracking."
        : "Incidents with outbound customer comms",
    },
  ];

  return (
    <div className="page-shell page-stack">
      {/* ── Hero ── */}
      <section className="dash-hero section-enter">
        <div className="dash-hero-inner">
          <div className="dash-hero-text">
            <p className="page-kicker">Analytics</p>
            <h1 className="page-title">Reporting & insights</h1>
          </div>
          <div className="page-header-actions">
            <Link className="btn btn-ghost btn-sm" href="/api/incidents/export?format=csv">
              Export CSV
            </Link>
            <RefreshDataButton />
          </div>
        </div>
      </section>

      {/* ── Operating state ── */}
      <section className="section-enter">
        <div className="dash-section-header">
          <h2 className="dash-chart-title">Current operating state</h2>
          <p className="dash-chart-desc">The metrics leadership needs first when a response is active.</p>
        </div>
        <div className="dash-stats" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
          {operatingStats.map((s) => (
            <div key={s.label} className={`dash-stat-card${s.highlight ? " dash-stat-card-p1" : ""}`}>
              <div className="dash-stat-value" style={{ fontSize: 28 }}>{s.value}</div>
              <div className="dash-stat-label">{s.label}</div>
              <div className="dash-stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Coverage and timing ── */}
      <section className="section-enter">
        <div className="dash-section-header">
          <h2 className="dash-chart-title">Coverage and timing</h2>
          <p className="dash-chart-desc">Response quality indicators across resolution, triage, and customer communications.</p>
        </div>
        <div className="dash-stats" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {coverageStats.map((s) => (
            <div key={s.label} className="dash-stat-card">
              <div className="dash-stat-value" style={{ fontSize: 28 }}>{s.value}</div>
              <div className="dash-stat-label">{s.label}</div>
              <div className="dash-stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 14-day analytics ── */}
      <section className="section-enter">
        <div className="dash-section-header">
          <h2 className="dash-chart-title">14-day analytics trend</h2>
          <p className="dash-chart-desc">Incident volume and severity patterns for weekly review and board-level reporting.</p>
        </div>
        <div className="dash-chart-card">
          <ExecutiveCharts data={dashboard.series} />
        </div>
      </section>
    </div>
  );
}
