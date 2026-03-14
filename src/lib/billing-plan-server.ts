import { Prisma, PrismaClient } from "@prisma/client";
import { PlanTier, quotasForPlan } from "@/lib/billing-plan";
import { invalidatePlanTierCache } from "@/lib/plan-tier-cache";

async function updateWorkspacePlan(
  prisma: Prisma.TransactionClient,
  workspaceId: string,
  planTier: PlanTier,
): Promise<void> {
  const quota = quotasForPlan(planTier);

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      planTier,
      samlEnabled: planTier === "enterprise" ? undefined : false,
    },
  });

  await prisma.workspaceQuota.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      ...quota,
      onCallRotationEnabled: planTier === "pro" || planTier === "enterprise" ? undefined : false,
    },
    update: {
      ...quota,
      onCallRotationEnabled: planTier === "pro" || planTier === "enterprise" ? undefined : false,
    },
  });
}

export async function applyWorkspacePlan(input: {
  prisma: PrismaClient | Prisma.TransactionClient;
  workspaceId: string;
  planTier: PlanTier;
}): Promise<void> {
  if ("$transaction" in input.prisma) {
    await input.prisma.$transaction((tx) =>
      updateWorkspacePlan(tx, input.workspaceId, input.planTier),
    );
  } else {
    await updateWorkspacePlan(input.prisma, input.workspaceId, input.planTier);
  }

  await invalidatePlanTierCache(input.workspaceId);
}
