import Link from "next/link";
import { Clock3, FileText } from "lucide-react";
import { CreateIncidentForm } from "@/components/create-incident-form";
import { DashboardIncidentQueue } from "@/components/dashboard-incident-queue";
import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getExecutiveDashboard } from "@/lib/read-models";

export default async function DashboardPage() {
  const auth = await requireAuth();

  const [executiveData, totalIncidents] = await Promise.all([
    getExecutiveDashboard(auth.user.workspaceId),
    prisma.incident.count({
      where: { workspaceId: auth.user.workspaceId },
    }),
  ]);

  const snapshot = executiveData.snapshot;
  const counts = {
    total: totalIncidents,
    p1: snapshot?.p1OpenIncidents ?? 0,
    open: snapshot?.openIncidents ?? 0,
    resolved: snapshot?.incidentsResolvedLast7d ?? 0,
    created7d: snapshot?.incidentsCreatedLast7d ?? 0,
    avgResolutionHours: snapshot?.avgResolutionHoursLast30d ?? 0,
  };

  return (
    <div className="space-y-16 pt-8">
      <OnboardingChecklist />

      <section className="section-enter flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="kicker">Incident operations</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-100">Command dashboard</h2>
          <p className="mt-2 max-w-3xl text-sm text-neutral-500">
            Track incident pressure, ownership, and response quality in one workspace view.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="btn btn-ghost" href="/api/incidents/export?format=csv">
            <FileText className="h-4 w-4" />
            Export incidents
          </Link>
          <Link className="btn btn-primary" href="/executive">
            Open executive view
          </Link>
        </div>
      </section>

      <section className="section-enter pb-10 border-b border-white/5">
        <h3 className="text-xl font-medium text-slate-100 mb-8">Live metrics</h3>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">Total incidents</p>
            <p className="text-2xl font-light text-slate-100">{counts.total}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-red-400/80 font-medium">P1 open</p>
            <p className="text-2xl font-light text-red-400">{counts.p1}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-amber-500/80 font-medium">Open (All)</p>
            <p className="text-2xl font-light text-amber-400">{counts.open}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-emerald-500/80 font-medium">Resolved (7d)</p>
            <p className="text-2xl font-light text-emerald-400">{counts.resolved}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">Created (7d)</p>
            <p className="text-2xl font-light text-slate-100">{counts.created7d}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">Avg resolve</p>
            <p className="text-2xl font-light text-slate-100">{counts.avgResolutionHours} <span className="text-sm text-neutral-500">hrs</span></p>
          </div>
        </div>
      </section>

      <section className="section-enter pb-10 border-b border-white/5">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-medium text-slate-100">Executive read-model snapshot</h3>
            <p className="text-sm text-neutral-500">Cached analytics summary for leadership.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-neutral-500 font-medium px-3 py-1 rounded-full border border-white/10 bg-white/5">
            <Clock3 className="h-3 w-3" />
            {snapshot?.updatedAt ? new Date(snapshot.updatedAt).toLocaleString("en-US") : "No snapshot yet"}
          </span>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          <div className="group relative p-5 rounded-2xl border border-white/5 bg-white/5 transition-colors hover:border-white/10">
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium mb-2">Triage coverage (30d)</p>
            <p className="text-3xl font-light text-slate-100">{snapshot?.triageCoveragePct ?? 0}<span className="text-lg text-neutral-500 ml-1">%</span></p>
          </div>
          <div className="group relative p-5 rounded-2xl border border-white/5 bg-white/5 transition-colors hover:border-white/10">
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium mb-2">Customer updates (30d)</p>
            <p className="text-3xl font-light text-slate-100">{snapshot?.customerUpdateCoveragePct ?? 0}<span className="text-lg text-neutral-500 ml-1">%</span></p>
          </div>
          <div className="group relative p-5 rounded-2xl border border-red-500/20 bg-red-500/5 transition-colors hover:border-red-500/30">
            <p className="text-[10px] uppercase tracking-widest text-red-400 font-medium mb-2">P1 currently open</p>
            <p className="text-3xl font-light text-red-400">{snapshot?.p1OpenIncidents ?? 0}</p>
          </div>
        </div>
      </section>

      <section className="section-enter pb-10 border-b border-white/5">
        <h3 className="mb-1 text-xl font-medium text-slate-100">Create incident</h3>
        <p className="mb-6 text-sm text-neutral-500">
          Log customer-facing AI failures and trigger ownership immediately.
        </p>
        <CreateIncidentForm />
      </section>

      <DashboardIncidentQueue />
    </div>
  );
}
