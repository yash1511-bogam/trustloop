import {
  EventType,
  IncidentSeverity,
  IncidentStatus,
  Prisma,
  SlaState,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

type PrismaExecutor = Prisma.TransactionClient | typeof prisma;

type WorkspaceSlaPolicyShape = {
  firstResponseHoursP1: number;
  firstResponseHoursP2: number;
  firstResponseHoursP3: number;
  resolutionHoursP1: number;
  resolutionHoursP2: number;
  resolutionHoursP3: number;
  autoEscalateP2AfterHours: number;
};

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + Math.max(0, hours) * 3_600_000);
}

export async function ensureWorkspaceSlaPolicy(
  workspaceId: string,
  tx?: PrismaExecutor,
): Promise<WorkspaceSlaPolicyShape> {
  const executor = tx ?? prisma;
  return executor.workspaceSlaPolicy.upsert({
    where: { workspaceId },
    create: { workspaceId },
    update: {},
    select: {
      firstResponseHoursP1: true,
      firstResponseHoursP2: true,
      firstResponseHoursP3: true,
      resolutionHoursP1: true,
      resolutionHoursP2: true,
      resolutionHoursP3: true,
      autoEscalateP2AfterHours: true,
    },
  });
}

export function buildIncidentSlaFields(input: {
  createdAt?: Date;
  severity: IncidentSeverity;
  policy: WorkspaceSlaPolicyShape;
}) {
  const createdAt = input.createdAt ?? new Date();
  const firstResponseHours =
    input.severity === IncidentSeverity.P1
      ? input.policy.firstResponseHoursP1
      : input.severity === IncidentSeverity.P2
        ? input.policy.firstResponseHoursP2
        : input.policy.firstResponseHoursP3;

  const resolutionHours =
    input.severity === IncidentSeverity.P1
      ? input.policy.resolutionHoursP1
      : input.severity === IncidentSeverity.P2
        ? input.policy.resolutionHoursP2
        : input.policy.resolutionHoursP3;

  return {
    slaFirstResponseDueAt: addHours(createdAt, firstResponseHours),
    slaResolutionDueAt: addHours(createdAt, resolutionHours),
    slaState: SlaState.ON_TRACK,
  };
}

export async function markIncidentFirstResponse(
  incidentId: string,
  tx?: PrismaExecutor,
): Promise<void> {
  const executor = tx ?? prisma;
  await executor.incident.updateMany({
    where: {
      id: incidentId,
      firstRespondedAt: null,
    },
    data: {
      firstRespondedAt: new Date(),
    },
  });
}

export async function markIncidentCustomerUpdateDelivered(
  incidentId: string,
  tx?: PrismaExecutor,
): Promise<void> {
  const executor = tx ?? prisma;
  const now = new Date();

  const incident = await executor.incident.findUniqueOrThrow({
    where: { id: incidentId },
    select: { firstCustomerUpdateAt: true },
  });

  await executor.incident.update({
    where: { id: incidentId },
    data: {
      lastCustomerUpdateAt: now,
      ...(incident.firstCustomerUpdateAt == null && { firstCustomerUpdateAt: now }),
      customerUpdateCount: { increment: 1 },
    },
  });
}

export async function runWorkspaceSlaAutomation(workspaceId?: string) {
  const incidents = await prisma.incident.findMany({
    where: {
      workspaceId: workspaceId ?? undefined,
      status: {
        not: IncidentStatus.RESOLVED,
      },
    },
    select: {
      id: true,
      workspaceId: true,
      status: true,
      severity: true,
      createdAt: true,
      firstRespondedAt: true,
      slaFirstResponseDueAt: true,
      slaResolutionDueAt: true,
      slaFirstResponseBreachedAt: true,
      slaResolutionBreachedAt: true,
      slaState: true,
      priorityEscalatedAt: true,
    },
    orderBy: { updatedAt: "asc" },
    take: workspaceId ? 300 : 1000,
  });

  let firstResponseBreaches = 0;
  let resolutionBreaches = 0;
  let escalations = 0;

  for (const incident of incidents) {
    const policy = await ensureWorkspaceSlaPolicy(incident.workspaceId);
    const now = new Date();
    const firstResponseBreached =
      !incident.firstRespondedAt &&
      incident.slaFirstResponseDueAt &&
      incident.slaFirstResponseDueAt <= now &&
      !incident.slaFirstResponseBreachedAt;
    const resolutionBreached =
      incident.slaResolutionDueAt &&
      incident.slaResolutionDueAt <= now &&
      !incident.slaResolutionBreachedAt;
    const shouldEscalate =
      incident.severity === IncidentSeverity.P2 &&
      !incident.priorityEscalatedAt &&
      addHours(incident.createdAt, policy.autoEscalateP2AfterHours) <= now;

    if (!firstResponseBreached && !resolutionBreached && !shouldEscalate) {
      continue;
    }

    await prisma.$transaction(async (tx) => {
      if (firstResponseBreached) {
        firstResponseBreaches += 1;
        await tx.incident.update({
          where: { id: incident.id },
          data: {
            slaFirstResponseBreachedAt: now,
            slaState:
              incident.slaState === SlaState.RESOLUTION_BREACHED
                ? SlaState.RESOLUTION_BREACHED
                : SlaState.FIRST_RESPONSE_BREACHED,
          },
        });
        await tx.incidentEvent.create({
          data: {
            incidentId: incident.id,
            eventType: EventType.SLA_BREACH,
            body: "Incident breached first-response SLA.",
          },
        });
      }

      if (resolutionBreached) {
        resolutionBreaches += 1;
        await tx.incident.update({
          where: { id: incident.id },
          data: {
            slaResolutionBreachedAt: now,
            slaState: SlaState.RESOLUTION_BREACHED,
          },
        });
        await tx.incidentEvent.create({
          data: {
            incidentId: incident.id,
            eventType: EventType.SLA_BREACH,
            body: "Incident breached resolution SLA.",
          },
        });
      }

      if (shouldEscalate) {
        escalations += 1;
        const nextPolicy = await ensureWorkspaceSlaPolicy(incident.workspaceId, tx);
        await tx.incident.update({
          where: { id: incident.id },
          data: {
            severity: IncidentSeverity.P1,
            priorityEscalatedAt: now,
            ...buildIncidentSlaFields({
              createdAt: incident.createdAt,
              severity: IncidentSeverity.P1,
              policy: nextPolicy,
            }),
          },
        });
        await tx.incidentEvent.create({
          data: {
            incidentId: incident.id,
            eventType: EventType.AUTO_ESCALATED,
            body: "Incident auto-escalated from P2 to P1 after SLA threshold.",
          },
        });
      }
    });
  }

  return {
    firstResponseBreaches,
    resolutionBreaches,
    escalations,
    considered: incidents.length,
  };
}
