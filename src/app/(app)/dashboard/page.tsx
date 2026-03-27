import { DashboardPageClient } from "@/components/dashboard-page-client";
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
    <DashboardPageClient
      counts={counts}
      snapshot={snapshot ? {
        ...snapshot,
        updatedAt: snapshot.updatedAt ?? null,
      } : null}
    />
  );
}
