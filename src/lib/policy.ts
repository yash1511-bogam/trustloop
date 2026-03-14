import { prisma } from "@/lib/prisma";
import { clampQuotaToPlan, quotasForPlan, resolveEffectivePlanTier } from "@/lib/billing-plan";
import {
  redisGetJson,
  redisIncrementWithExpiry,
  redisSetJson,
} from "@/lib/redis";

type QuotaPolicy = {
  apiRequestsPerMinute: number;
  incidentsPerDay: number;
  triageRunsPerDay: number;
  customerUpdatesPerDay: number;
  reminderEmailsPerDay: number;
};

type DailyUsage = {
  incidentsCreated: number;
  triageRuns: number;
  customerUpdates: number;
  reminderEmailsSent: number;
};

export type QuotaMetric =
  | "incidents"
  | "triage"
  | "customer_updates"
  | "reminder_emails";

const QUOTA_CACHE_SECONDS = 300;

type MetricMapping = {
  policyField: keyof QuotaPolicy;
  usageField: keyof DailyUsage;
};

const metricMap: Record<QuotaMetric, MetricMapping> = {
  incidents: {
    policyField: "incidentsPerDay",
    usageField: "incidentsCreated",
  },
  triage: {
    policyField: "triageRunsPerDay",
    usageField: "triageRuns",
  },
  customer_updates: {
    policyField: "customerUpdatesPerDay",
    usageField: "customerUpdates",
  },
  reminder_emails: {
    policyField: "reminderEmailsPerDay",
    usageField: "reminderEmailsSent",
  },
};

function quotaCacheKey(workspaceId: string): string {
  return `quota:policy:${workspaceId}`;
}

function minuteBucketEpoch(): number {
  return Math.floor(Date.now() / 60_000);
}

function startOfUtcDay(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

async function ensureQuotaPolicy(workspaceId: string): Promise<QuotaPolicy> {
  const cached = await redisGetJson<QuotaPolicy>(quotaCacheKey(workspaceId));
  if (cached) {
    return cached;
  }

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
  const effectivePlan = resolveEffectivePlanTier({
    planTier: workspace?.planTier,
    billingStatus: workspace?.billing?.status,
    trialEndsAt: workspace?.trialEndsAt,
  });
  const defaultQuota = quotasForPlan(effectivePlan);

  const row = await prisma.workspaceQuota.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      ...defaultQuota,
    },
    update: {},
    select: {
      apiRequestsPerMinute: true,
      incidentsPerDay: true,
      triageRunsPerDay: true,
      customerUpdatesPerDay: true,
      reminderEmailsPerDay: true,
    },
  });

  const capped = clampQuotaToPlan(row, effectivePlan);

  await redisSetJson<QuotaPolicy>(quotaCacheKey(workspaceId), capped, QUOTA_CACHE_SECONDS);
  return capped;
}

async function loadDailyUsage(workspaceId: string): Promise<DailyUsage> {
  const usageDate = startOfUtcDay();
  const usage = await prisma.workspaceDailyUsage.upsert({
    where: {
      workspaceId_usageDate: {
        workspaceId,
        usageDate,
      },
    },
    create: {
      workspaceId,
      usageDate,
    },
    update: {},
    select: {
      incidentsCreated: true,
      triageRuns: true,
      customerUpdates: true,
      reminderEmailsSent: true,
    },
  });

  return usage;
}

export async function enforceWorkspaceRateLimit(workspaceId: string): Promise<{
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetAtUnix: number;
}> {
  const policy = await ensureQuotaPolicy(workspaceId);
  const limit = policy.apiRequestsPerMinute;
  const bucket = minuteBucketEpoch();
  const key = `ratelimit:${workspaceId}:${bucket}`;

  const current = await redisIncrementWithExpiry(key, 90);
  const remaining = Math.max(0, limit - current);

  return {
    allowed: current <= limit,
    limit,
    remaining,
    retryAfterSeconds: 60,
    resetAtUnix: (bucket + 1) * 60,
  };
}

export async function enforceWorkspaceQuota(
  workspaceId: string,
  metric: QuotaMetric,
): Promise<{
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
}> {
  const policy = await ensureQuotaPolicy(workspaceId);
  const usage = await loadDailyUsage(workspaceId);

  const mapping = metricMap[metric];
  const limit = policy[mapping.policyField];
  const used = usage[mapping.usageField];
  const remaining = Math.max(0, limit - used);

  return {
    allowed: used < limit,
    limit,
    used,
    remaining,
  };
}

export async function consumeWorkspaceQuota(
  workspaceId: string,
  metric: QuotaMetric,
  amount = 1,
): Promise<void> {
  const usageDate = startOfUtcDay();
  const mapping = metricMap[metric];

  const incrementData = {
    incidentsCreated: 0,
    triageRuns: 0,
    customerUpdates: 0,
    reminderEmailsSent: 0,
  };
  incrementData[mapping.usageField] = amount;

  await prisma.workspaceDailyUsage.upsert({
    where: {
      workspaceId_usageDate: {
        workspaceId,
        usageDate,
      },
    },
    create: {
      workspaceId,
      usageDate,
      incidentsCreated: incrementData.incidentsCreated,
      triageRuns: incrementData.triageRuns,
      customerUpdates: incrementData.customerUpdates,
      reminderEmailsSent: incrementData.reminderEmailsSent,
    },
    update: {
      incidentsCreated: { increment: incrementData.incidentsCreated },
      triageRuns: { increment: incrementData.triageRuns },
      customerUpdates: { increment: incrementData.customerUpdates },
      reminderEmailsSent: { increment: incrementData.reminderEmailsSent },
    },
  });
}
