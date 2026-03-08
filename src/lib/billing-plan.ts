import { PrismaClient } from "@prisma/client";

export type PlanTier = "starter" | "pro" | "enterprise";

export function normalizePlanTier(value: string | null | undefined): PlanTier {
  if (value === "starter" || value === "enterprise") {
    return value;
  }
  return "pro";
}

export function quotasForPlan(planTier: PlanTier): {
  incidentsPerDay: number;
  triageRunsPerDay: number;
  customerUpdatesPerDay: number;
  reminderEmailsPerDay: number;
} {
  if (planTier === "starter") {
    return {
      incidentsPerDay: 50,
      triageRunsPerDay: 100,
      customerUpdatesPerDay: 100,
      reminderEmailsPerDay: 120,
    };
  }

  if (planTier === "enterprise") {
    return {
      incidentsPerDay: 1_000_000,
      triageRunsPerDay: 1_000_000,
      customerUpdatesPerDay: 1_000_000,
      reminderEmailsPerDay: 1_000_000,
    };
  }

  return {
    incidentsPerDay: 200,
    triageRunsPerDay: 300,
    customerUpdatesPerDay: 300,
    reminderEmailsPerDay: 500,
  };
}

export async function applyWorkspacePlan(input: {
  prisma: PrismaClient;
  workspaceId: string;
  planTier: PlanTier;
}): Promise<void> {
  const quota = quotasForPlan(input.planTier);

  await input.prisma.$transaction(async (tx) => {
    await tx.workspace.update({
      where: { id: input.workspaceId },
      data: { planTier: input.planTier },
    });

    await tx.workspaceQuota.upsert({
      where: { workspaceId: input.workspaceId },
      create: {
        workspaceId: input.workspaceId,
        ...quota,
      },
      update: {
        ...quota,
      },
    });
  });
}
