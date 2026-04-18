import { NextRequest, NextResponse } from "next/server";
import { requireInternalApiAuth, requireRole } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { reminderQueueUrl } from "@/lib/queue";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireInternalApiAuth(request);
  if (!auth || !requireRole(auth, ["CEO", "TECH"])) return NextResponse.json(null, { status: 404 });

  const d24h = new Date(Date.now() - 24 * 3_600_000);

  // Health checks
  let dbOk = false;
  try { await prisma.$queryRaw`SELECT 1`; dbOk = true; } catch {}
  let redisOk = false;
  try {
    if (!redis) { redisOk = true; } else {
      if (redis.status === "wait") await redis.connect();
      redisOk = (await redis.ping()) === "PONG";
    }
  } catch {}

  const [
    reminderQueued, reminderProcessed, reminderFailed, recentReminderFailures,
    outboxPending,
    webhookTotal, webhookSucceeded, webhookFailed, recentWebhookFailures,
    aiKeys,
    emailTotal, emailSent, emailFailed, emailFailuresByType,
    pushTotal, pushActive, pushDisabled,
  ] = await Promise.all([
    prisma.reminderJobLog.count({ where: { status: "QUEUED" } }),
    prisma.reminderJobLog.count({ where: { status: "PROCESSED" } }),
    prisma.reminderJobLog.count({ where: { status: "FAILED" } }),
    prisma.reminderJobLog.findMany({ where: { status: "FAILED" }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, errorMessage: true, createdAt: true } }),
    prisma.outboundWebhookOutbox.count({ where: { processAt: { lte: new Date() } } }),
    prisma.outboundWebhookDelivery.count({ where: { deliveredAt: { gte: d24h } } }),
    prisma.outboundWebhookDelivery.count({ where: { deliveredAt: { gte: d24h }, isSuccess: true } }),
    prisma.outboundWebhookDelivery.count({ where: { deliveredAt: { gte: d24h }, isSuccess: false } }),
    prisma.outboundWebhookDelivery.findMany({ where: { deliveredAt: { gte: d24h }, isSuccess: false }, orderBy: { deliveredAt: "desc" }, take: 10, select: { id: true, eventType: true, errorMessage: true, statusCode: true, deliveredAt: true } }),
    prisma.aiProviderKey.findMany({ select: { workspaceId: true, provider: true, healthStatus: true, lastVerifiedAt: true, lastVerificationError: true, workspace: { select: { name: true } } } }),
    prisma.emailNotificationLog.count({ where: { createdAt: { gte: d24h } } }),
    prisma.emailNotificationLog.count({ where: { createdAt: { gte: d24h }, status: "SENT" } }),
    prisma.emailNotificationLog.count({ where: { createdAt: { gte: d24h }, status: "FAILED" } }),
    prisma.emailNotificationLog.groupBy({ by: ["type"], where: { createdAt: { gte: d24h }, status: "FAILED" }, _count: true }),
    prisma.pushSubscription.count(),
    prisma.pushSubscription.count({ where: { disabledAt: null } }),
    prisma.pushSubscription.count({ where: { disabledAt: { not: null } } }),
  ]);

  return NextResponse.json({
    health: { database: dbOk, redis: redisOk, reminderQueueConfigured: Boolean(reminderQueueUrl()) },
    queues: {
      reminderJobs: { queued: reminderQueued, processed: reminderProcessed, failed: reminderFailed },
      recentReminderFailures,
      outboundWebhookOutbox: outboxPending,
    },
    webhookDeliveries: { last24h: { total: webhookTotal, succeeded: webhookSucceeded, failed: webhookFailed }, recentFailures: recentWebhookFailures },
    aiKeyHealth: aiKeys.map((k) => ({ workspaceId: k.workspaceId, workspaceName: k.workspace.name, provider: k.provider, healthStatus: k.healthStatus, lastVerifiedAt: k.lastVerifiedAt, lastVerificationError: k.lastVerificationError })),
    emailDelivery: { last24h: { total: emailTotal, sent: emailSent, failed: emailFailed }, failuresByType: emailFailuresByType.map((g) => ({ type: g.type, count: g._count })) },
    pushSubscriptions: { total: pushTotal, active: pushActive, disabled: pushDisabled },
  });
}
