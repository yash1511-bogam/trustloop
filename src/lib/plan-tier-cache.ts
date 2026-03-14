import { resolveEffectivePlanTier } from "@/lib/billing-plan";
import { prisma } from "@/lib/prisma";
import { redisGet, redisSet, redisDelete } from "@/lib/redis";

const PREFIX = "plan_tier:";
const TTL_SECONDS = 300; // 5 minutes

export async function getWorkspacePlanTier(workspaceId: string): Promise<string> {
  const cached = await redisGet(`${PREFIX}${workspaceId}`);
  if (cached) return cached;

  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      planTier: true,
      trialEndsAt: true,
      billing: {
        select: {
          status: true,
        },
      },
    },
  });
  const tier = resolveEffectivePlanTier({
    planTier: ws?.planTier,
    billingStatus: ws?.billing?.status,
    trialEndsAt: ws?.trialEndsAt,
  });
  await redisSet(`${PREFIX}${workspaceId}`, tier, TTL_SECONDS);
  return tier;
}

export async function invalidatePlanTierCache(workspaceId: string): Promise<void> {
  await redisDelete(`${PREFIX}${workspaceId}`);
}
