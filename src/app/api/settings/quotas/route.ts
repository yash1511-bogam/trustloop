import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { hasRole } from "@/lib/auth";
import { recordAuditForAccess } from "@/lib/audit";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import {
  planDefinitionFor,
  quotasForPlan,
  resolveEffectivePlanTier,
} from "@/lib/billing-plan";
import { badRequest, forbidden } from "@/lib/http";
import { featureGateError, isFeatureAllowed } from "@/lib/feature-gate";
import { prisma } from "@/lib/prisma";
import { redisDelete } from "@/lib/redis";

const quotaSchema = z.object({
  apiRequestsPerMinute: z.int().min(1).max(1_000_000),
  incidentsPerDay: z.int().min(1).max(1_000_000),
  triageRunsPerDay: z.int().min(1).max(1_000_000),
  customerUpdatesPerDay: z.int().min(1).max(1_000_000),
  reminderEmailsPerDay: z.int().min(1).max(1_000_000),
  reminderIntervalHoursP1: z.int().min(1).max(168).optional(),
  reminderIntervalHoursP2: z.int().min(1).max(336).optional(),
  onCallRotationEnabled: z.boolean().optional(),
  onCallRotationIntervalHours: z.int().min(1).max(168).optional(),
  onCallRotationAnchorAt: z.string().datetime().optional(),
});

function quotaCacheKey(workspaceId: string): string {
  return `quota:policy:${workspaceId}`;
}

async function loadEffectivePlanTier(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
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

  return resolveEffectivePlanTier({
    planTier: workspace?.planTier,
    billingStatus: workspace?.billing?.status,
    trialEndsAt: workspace?.trialEndsAt,
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) {
    return access.response;
  }

  const auth = access.auth;
  if (auth.kind !== "session") {
    return forbidden();
  }

  const planTier = await loadEffectivePlanTier(auth.workspaceId);
  const planQuota = quotasForPlan(planTier);
  const onCallAllowed = isFeatureAllowed(planTier, "on_call");

  const quota = await prisma.workspaceQuota.upsert({
    where: { workspaceId: auth.workspaceId },
    create: {
      workspaceId: auth.workspaceId,
      ...planQuota,
    },
    update: {},
  });

  const sanitizedQuota = {
    ...quota,
    apiRequestsPerMinute: Math.min(quota.apiRequestsPerMinute, planQuota.apiRequestsPerMinute),
    incidentsPerDay: Math.min(quota.incidentsPerDay, planQuota.incidentsPerDay),
    triageRunsPerDay: Math.min(quota.triageRunsPerDay, planQuota.triageRunsPerDay),
    customerUpdatesPerDay: Math.min(quota.customerUpdatesPerDay, planQuota.customerUpdatesPerDay),
    reminderEmailsPerDay: Math.min(quota.reminderEmailsPerDay, planQuota.reminderEmailsPerDay),
    onCallRotationEnabled: onCallAllowed ? quota.onCallRotationEnabled : false,
  };

  if (
    sanitizedQuota.apiRequestsPerMinute !== quota.apiRequestsPerMinute ||
    sanitizedQuota.incidentsPerDay !== quota.incidentsPerDay ||
    sanitizedQuota.triageRunsPerDay !== quota.triageRunsPerDay ||
    sanitizedQuota.customerUpdatesPerDay !== quota.customerUpdatesPerDay ||
    sanitizedQuota.reminderEmailsPerDay !== quota.reminderEmailsPerDay ||
    sanitizedQuota.onCallRotationEnabled !== quota.onCallRotationEnabled
  ) {
    await prisma.workspaceQuota.update({
      where: { workspaceId: auth.workspaceId },
      data: {
        apiRequestsPerMinute: sanitizedQuota.apiRequestsPerMinute,
        incidentsPerDay: sanitizedQuota.incidentsPerDay,
        triageRunsPerDay: sanitizedQuota.triageRunsPerDay,
        customerUpdatesPerDay: sanitizedQuota.customerUpdatesPerDay,
        reminderEmailsPerDay: sanitizedQuota.reminderEmailsPerDay,
        onCallRotationEnabled: sanitizedQuota.onCallRotationEnabled,
      },
    });
  }

  return NextResponse.json({ quota: sanitizedQuota });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) {
    return access.response;
  }

  const auth = access.auth;
  if (auth.kind !== "session") {
    return forbidden();
  }
  if (!hasRole({ user: auth.user }, [Role.OWNER, Role.MANAGER])) {
    return forbidden();
  }

  const body = await request.json().catch(() => null);
  const parsed = quotaSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid quota payload.");
  }

  const planTier = await loadEffectivePlanTier(auth.workspaceId);
  const planQuota = quotasForPlan(planTier);
  const onCallAllowed = isFeatureAllowed(planTier, "on_call");

  if (parsed.data.onCallRotationEnabled && !onCallAllowed) {
    return badRequest(featureGateError("on_call"));
  }

  const overLimitFields = [
    ["apiRequestsPerMinute", parsed.data.apiRequestsPerMinute, planQuota.apiRequestsPerMinute],
    ["incidentsPerDay", parsed.data.incidentsPerDay, planQuota.incidentsPerDay],
    ["triageRunsPerDay", parsed.data.triageRunsPerDay, planQuota.triageRunsPerDay],
    ["customerUpdatesPerDay", parsed.data.customerUpdatesPerDay, planQuota.customerUpdatesPerDay],
    ["reminderEmailsPerDay", parsed.data.reminderEmailsPerDay, planQuota.reminderEmailsPerDay],
  ].filter(([, submitted, limit]) => submitted > limit);

  if (overLimitFields.length > 0) {
    const fieldLabels = overLimitFields.map(([field]) => field).join(", ");
    return badRequest(
      `${planDefinitionFor(planTier).label} plan limit exceeded for: ${fieldLabels}.`,
    );
  }

  const quota = await prisma.workspaceQuota.upsert({
    where: { workspaceId: auth.workspaceId },
    create: {
      workspaceId: auth.workspaceId,
      ...parsed.data,
      onCallRotationEnabled: onCallAllowed ? parsed.data.onCallRotationEnabled : false,
      onCallRotationAnchorAt: parsed.data.onCallRotationAnchorAt
        ? new Date(parsed.data.onCallRotationAnchorAt)
        : undefined,
    },
    update: {
      ...parsed.data,
      onCallRotationEnabled: onCallAllowed ? parsed.data.onCallRotationEnabled : false,
      onCallRotationAnchorAt: parsed.data.onCallRotationAnchorAt
        ? new Date(parsed.data.onCallRotationAnchorAt)
        : undefined,
    },
  });

  await redisDelete(quotaCacheKey(auth.workspaceId));

  recordAuditForAccess({
    access: auth,
    request,
    action: "quota.updated",
    targetType: "WorkspaceQuota",
    summary: "Updated workspace quota/SLA settings",
  }).catch(() => {});

  return NextResponse.json({ quota });
}
