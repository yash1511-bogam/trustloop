import { requireAuth } from "@/lib/auth";
import { getExecutiveDashboard, refreshWorkspaceReadModels } from "@/lib/read-models";

export default async function ExecutivePage() {
  const auth = await requireAuth();

  let dashboard = await getExecutiveDashboard(auth.user.workspaceId);
  if (!dashboard.snapshot) {
    await refreshWorkspaceReadModels(auth.user.workspaceId);
    dashboard = await getExecutiveDashboard(auth.user.workspaceId);
  }

  const snapshot = dashboard.snapshot;

  return (
    <div className="space-y-5">
      <section className="surface p-5">
        <h2 className="text-2xl font-semibold">Executive dashboard</h2>
        <p className="mt-1 text-sm text-slate-600">
          Tenant-scoped read models for incident operations and reliability leadership.
        </p>
      </section>

      <section className="grid-cards">
        <article className="metric-card">
          <p className="kicker">Open incidents</p>
          <p className="mt-2 text-3xl font-semibold">{snapshot?.openIncidents ?? 0}</p>
        </article>
        <article className="metric-card">
          <p className="kicker">P1 open</p>
          <p className="mt-2 text-3xl font-semibold text-red-700">
            {snapshot?.p1OpenIncidents ?? 0}
          </p>
        </article>
        <article className="metric-card">
          <p className="kicker">Created (7d)</p>
          <p className="mt-2 text-3xl font-semibold">{snapshot?.incidentsCreatedLast7d ?? 0}</p>
        </article>
        <article className="metric-card">
          <p className="kicker">Resolved (7d)</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-700">
            {snapshot?.incidentsResolvedLast7d ?? 0}
          </p>
        </article>
      </section>

      <section className="surface p-5">
        <h3 className="mb-3 text-lg font-semibold">Coverage and timing</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <article className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="kicker">Avg resolution (hrs, 30d)</p>
            <p className="mt-1 text-2xl font-semibold">
              {snapshot?.avgResolutionHoursLast30d ?? 0}
            </p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="kicker">Triage coverage (30d)</p>
            <p className="mt-1 text-2xl font-semibold">{snapshot?.triageCoveragePct ?? 0}%</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="kicker">Customer update coverage (30d)</p>
            <p className="mt-1 text-2xl font-semibold">
              {snapshot?.customerUpdateCoveragePct ?? 0}%
            </p>
          </article>
        </div>
      </section>

      <section className="surface overflow-hidden">
        <div className="border-b border-slate-200 p-4">
          <h3 className="text-lg font-semibold">14-day analytics trend</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Day</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Resolved</th>
                <th className="px-4 py-3">Open EOD</th>
                <th className="px-4 py-3">P1 Created</th>
                <th className="px-4 py-3">Triage Runs</th>
                <th className="px-4 py-3">Customer Updates</th>
                <th className="px-4 py-3">Reminder Emails</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.series.map((row) => (
                <tr className="border-t border-slate-100" key={row.day}>
                  <td className="px-4 py-3">{row.day}</td>
                  <td className="px-4 py-3">{row.incidentsCreated}</td>
                  <td className="px-4 py-3">{row.incidentsResolved}</td>
                  <td className="px-4 py-3">{row.openAtEndOfDay}</td>
                  <td className="px-4 py-3">{row.p1Created}</td>
                  <td className="px-4 py-3">{row.triageRuns}</td>
                  <td className="px-4 py-3">{row.customerUpdatesSent}</td>
                  <td className="px-4 py-3">{row.reminderEmailsSent}</td>
                </tr>
              ))}

              {dashboard.series.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-slate-500" colSpan={8}>
                    No analytics rows generated yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
