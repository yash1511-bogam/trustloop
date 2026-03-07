
import { EmailDeliveryStatus, EmailNotificationType, EventType, IncidentStatus } from "@prisma/client";
import { DASHBOARD_CACHE_TTL_SECONDS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { redisDelete, redisGetJson, redisSetJson } from "@/lib/redis";

function startOfUtcDay(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function toPercent(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }
  return Number(((numerator / denominator) * 100).toFixed(2));
}

function execCacheKey(workspaceId: string): string {
  return `dashboard:exec:${workspaceId}`;
}

export async function refreshWorkspaceReadModels(workspaceId: string): Promise<void> {
  const todayStart = startOfUtcDay();
  const tomorrowStart = addDays(todayStart, 1);

  const [
    incidentsCreated,
    incidentsResolved,
    openAtEndOfDay,
    p1Created,
    triageRuns,
    customerUpdatesSent,
    reminderEmailsSent,
    resolvedToday,
    openIncidents,
    p1OpenIncidents,
    incidentsCreatedLast7d,
    incidentsResolvedLast7d,
    resolvedLast30d,
    incidentsLast30d,
  ] = await Promise.all([
    prisma.incident.count({
      where: {
        workspaceId,
        createdAt: { gte: todayStart, lt: tomorrowStart },
      },
    }),
    prisma.incident.count({
      where: {
        workspaceId,
        resolvedAt: { gte: todayStart, lt: tomorrowStart },
      },
    }),
    prisma.incident.count({
      where: {
        workspaceId,
        status: { not: IncidentStatus.RESOLVED },
      },
    }),
    prisma.incident.count({
      where: {
        workspaceId,
        severity: "P1",
        createdAt: { gte: todayStart, lt: tomorrowStart },
      },
    }),
    prisma.incidentEvent.count({
      where: {
        incident: { workspaceId },
        eventType: EventType.TRIAGE_RUN,
        createdAt: { gte: todayStart, lt: tomorrowStart },
      },
    }),
    prisma.incidentEvent.count({
      where: {
        incident: { workspaceId },
        eventType: EventType.CUSTOMER_UPDATE,
        createdAt: { gte: todayStart, lt: tomorrowStart },
      },
    }),
    prisma.emailNotificationLog.count({
      where: {
        workspaceId,
        type: EmailNotificationType.REMINDER,
        status: EmailDeliveryStatus.SENT,
        createdAt: { gte: todayStart, lt: tomorrowStart },
      },
    }),
    prisma.incident.findMany({
      where: {
        workspaceId,
        resolvedAt: { gte: todayStart, lt: tomorrowStart },
      },
      select: {
        createdAt: true,
        resolvedAt: true,
      },
    }),
    prisma.incident.count({
      where: {
        workspaceId,
        status: { not: IncidentStatus.RESOLVED },
      },
    }),
    prisma.incident.count({
      where: {
        workspaceId,
        status: { not: IncidentStatus.RESOLVED },
        severity: "P1",
      },
    }),
    prisma.incident.count({
      where: {
        workspaceId,
        createdAt: { gte: addDays(todayStart, -7) },
      },
    }),
    prisma.incident.count({
      where: {
        workspaceId,
        resolvedAt: { gte: addDays(todayStart, -7) },
      },
    }),
    prisma.incident.findMany({
      where: {
        workspaceId,
        resolvedAt: { gte: addDays(todayStart, -30) },
      },
      select: {
        createdAt: true,
        resolvedAt: true,
      },
    }),
    prisma.incident.findMany({
      where: {
        workspaceId,
        createdAt: { gte: addDays(todayStart, -30) },
      },
      select: {
        triageRunCount: true,
        customerUpdateCount: true,
      },
    }),
  ]);

  const mttrMinutesAvg =
    resolvedToday.length > 0
      ? Math.round(
          resolvedToday.reduce((sum, incident) => {
            if (!incident.resolvedAt) {
              return sum;
            }
            return sum + (incident.resolvedAt.getTime() - incident.createdAt.getTime()) / 60_000;
          }, 0) / resolvedToday.length,
        )
      : null;

  await prisma.incidentAnalyticsDaily.upsert({
    where: {
      workspaceId_day: {
        workspaceId,
        day: todayStart,
      },
    },
    create: {
      workspaceId,
      day: todayStart,
      incidentsCreated,
      incidentsResolved,
      openAtEndOfDay,
      p1Created,
      triageRuns,
      customerUpdatesSent,
      reminderEmailsSent,
      mttrMinutesAvg,
    },
    update: {
      incidentsCreated,
      incidentsResolved,
      openAtEndOfDay,
      p1Created,
      triageRuns,
      customerUpdatesSent,
      reminderEmailsSent,
      mttrMinutesAvg,
    },
  });

  const avgResolutionHoursLast30d =
    resolvedLast30d.length > 0
      ? Number(
          (
            resolvedLast30d.reduce((sum, incident) => {
              if (!incident.resolvedAt) {
                return sum;
              }
              return sum + (incident.resolvedAt.getTime() - incident.createdAt.getTime()) / 3_600_000;
            }, 0) / resolvedLast30d.length
          ).toFixed(2),
        )
      : 0;

  const triageCovered = incidentsLast30d.filter((item) => item.triageRunCount > 0).length;
  const customerUpdateCovered = incidentsLast30d.filter(
    (item) => item.customerUpdateCount > 0,
  ).length;

  await prisma.workspaceExecutiveSnapshot.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      openIncidents,
      p1OpenIncidents,
      incidentsCreatedLast7d,
      incidentsResolvedLast7d,
      avgResolutionHoursLast30d,
      triageCoveragePct: toPercent(triageCovered, incidentsLast30d.length),
      customerUpdateCoveragePct: toPercent(customerUpdateCovered, incidentsLast30d.length),
    },
    update: {
      openIncidents,
      p1OpenIncidents,
      incidentsCreatedLast7d,
      incidentsResolvedLast7d,
      avgResolutionHoursLast30d,
      triageCoveragePct: toPercent(triageCovered, incidentsLast30d.length),
      customerUpdateCoveragePct: toPercent(customerUpdateCovered, incidentsLast30d.length),
    },
  });

  await redisDelete(execCacheKey(workspaceId));
}

export async function getExecutiveDashboard(workspaceId: string): Promise<{
  snapshot: {
    openIncidents: number;
    p1OpenIncidents: number;
    incidentsCreatedLast7d: number;
    incidentsResolvedLast7d: number;
    avgResolutionHoursLast30d: number;
    triageCoveragePct: number;
    customerUpdateCoveragePct: number;
    updatedAt: string;
  } | null;
  series: Array<{
    day: string;
    incidentsCreated: number;
    incidentsResolved: number;
    openAtEndOfDay: number;
    p1Created: number;
    triageRuns: number;
    customerUpdatesSent: number;
    reminderEmailsSent: number;
  }>;
}> {
  const cacheKey = execCacheKey(workspaceId);
  const cached = await redisGetJson<{
    snapshot: {
      openIncidents: number;
      p1OpenIncidents: number;
      incidentsCreatedLast7d: number;
      incidentsResolvedLast7d: number;
      avgResolutionHoursLast30d: number;
      triageCoveragePct: number;
      customerUpdateCoveragePct: number;
      updatedAt: string;
    } | null;
    series: Array<{
      day: string;
      incidentsCreated: number;
      incidentsResolved: number;
      openAtEndOfDay: number;
      p1Created: number;
      triageRuns: number;
      customerUpdatesSent: number;
      reminderEmailsSent: number;
    }>;
  }>(cacheKey);

  if (cached) {
    return cached;
  }

  const [snapshot, seriesRows] = await Promise.all([
    prisma.workspaceExecutiveSnapshot.findUnique({ where: { workspaceId } }),
    prisma.incidentAnalyticsDaily.findMany({
      where: {
        workspaceId,
        day: {
          gte: addDays(startOfUtcDay(), -13),
        },
      },
      orderBy: { day: "asc" },
    }),
  ]);

  const payload = {
    snapshot: snapshot
      ? {
          openIncidents: snapshot.openIncidents,
          p1OpenIncidents: snapshot.p1OpenIncidents,
          incidentsCreatedLast7d: snapshot.incidentsCreatedLast7d,
          incidentsResolvedLast7d: snapshot.incidentsResolvedLast7d,
          avgResolutionHoursLast30d: snapshot.avgResolutionHoursLast30d,
          triageCoveragePct: snapshot.triageCoveragePct,
          customerUpdateCoveragePct: snapshot.customerUpdateCoveragePct,
          updatedAt: snapshot.updatedAt.toISOString(),
        }
      : null,
    series: seriesRows.map((row) => ({
      day: row.day.toISOString().slice(0, 10),
      incidentsCreated: row.incidentsCreated,
      incidentsResolved: row.incidentsResolved,
      openAtEndOfDay: row.openAtEndOfDay,
      p1Created: row.p1Created,
      triageRuns: row.triageRuns,
      customerUpdatesSent: row.customerUpdatesSent,
      reminderEmailsSent: row.reminderEmailsSent,
    })),
  };

  await redisSetJson(cacheKey, payload, DASHBOARD_CACHE_TTL_SECONDS);
  return payload;
}
