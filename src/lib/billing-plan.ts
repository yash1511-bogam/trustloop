import { PrismaClient } from "@prisma/client";

export type PlanTier = "starter" | "pro" | "enterprise";

export type PlanDefinition = {
  id: PlanTier;
  label: string;
  headline: string;
  description: string;
  bullets: string[];
};

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

export function planDefinitionFor(planTier: PlanTier): PlanDefinition {
  const quota = quotasForPlan(planTier);

  if (planTier === "starter") {
    return {
      id: "starter",
      label: "Starter",
      headline: "Lean coverage",
      description: "For smaller teams that need dependable incident coordination without a heavy monthly footprint.",
      bullets: [
        `${quota.incidentsPerDay.toLocaleString("en-US")} incidents per day`,
        `${quota.triageRunsPerDay.toLocaleString("en-US")} triage runs per day`,
        `${quota.customerUpdatesPerDay.toLocaleString("en-US")} customer updates per day`,
        `${quota.reminderEmailsPerDay.toLocaleString("en-US")} reminder emails per day`,
      ],
    };
  }

  if (planTier === "enterprise") {
    return {
      id: "enterprise",
      label: "Enterprise",
      headline: "High-scale operations",
      description: "For large or regulated teams that need very high throughput, stronger access controls, and fewer quota constraints.",
      bullets: [
        `${quota.incidentsPerDay.toLocaleString("en-US")} incidents per day`,
        `${quota.triageRunsPerDay.toLocaleString("en-US")} triage runs per day`,
        `${quota.customerUpdatesPerDay.toLocaleString("en-US")} customer updates per day`,
        `${quota.reminderEmailsPerDay.toLocaleString("en-US")} reminder emails per day`,
      ],
    };
  }

  return {
    id: "pro",
    label: "Pro",
    headline: "Daily operator default",
    description: "Balanced limits for teams running incident intake, triage, and customer comms as part of daily operations.",
    bullets: [
      `${quota.incidentsPerDay.toLocaleString("en-US")} incidents per day`,
      `${quota.triageRunsPerDay.toLocaleString("en-US")} triage runs per day`,
      `${quota.customerUpdatesPerDay.toLocaleString("en-US")} customer updates per day`,
      `${quota.reminderEmailsPerDay.toLocaleString("en-US")} reminder emails per day`,
    ],
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
