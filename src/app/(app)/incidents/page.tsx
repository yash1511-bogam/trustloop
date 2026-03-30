import { IncidentSeverity, IncidentStatus } from "@prisma/client";
import { IncidentsPageClient } from "@/components/incidents-page-client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function sevenDaysAgo() {
  return new Date(Date.now() - 7 * 86400000);
}

export default async function IncidentsPage() {
  const auth = await requireAuth();

  const cutoff = sevenDaysAgo();

  const [total, open, p1, resolved7d] = await Promise.all([
    prisma.incident.count({ where: { workspaceId: auth.user.workspaceId } }),
    prisma.incident.count({
      where: {
        workspaceId: auth.user.workspaceId,
        status: { not: IncidentStatus.RESOLVED },
      },
    }),
    prisma.incident.count({
      where: {
        workspaceId: auth.user.workspaceId,
        severity: IncidentSeverity.P1,
        status: { not: IncidentStatus.RESOLVED },
      },
    }),
    prisma.incident.count({
      where: {
        workspaceId: auth.user.workspaceId,
        status: IncidentStatus.RESOLVED,
        updatedAt: { gte: cutoff },
      },
    }),
  ]);

  return (
    <IncidentsPageClient
      counts={{ total, open, p1, resolved7d }}
    />
  );
}
