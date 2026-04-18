import { NextRequest, NextResponse } from "next/server";
import { requireInternalApiAuth, requireRole } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireInternalApiAuth(request);
  if (!auth || !requireRole(auth, ["CEO", "SUPPORT", "TECH"])) {
    return NextResponse.json(null, { status: 404 });
  }

  const { id } = await params;
  const isCeo = auth.role === "CEO";
  const isSupport = auth.role === "SUPPORT";

  const workspace = await prisma.workspace.findUnique({
    where: { id },
    select: {
      id: true, name: true, slug: true, planTier: true, timezone: true,
      statusPageEnabled: true, complianceMode: true, samlEnabled: true,
      customDomain: true, customDomainVerified: true, trialEndsAt: true,
      blockedAt: true, blockReason: true, blockedByEmail: true, createdAt: true,
    },
  });
  if (!workspace) return NextResponse.json(null, { status: 404 });

  const result: Record<string, unknown> = { ...workspace };

  // Users — CEO, SUPPORT
  if (isCeo || isSupport) {
    result.users = await prisma.user.findMany({
      where: { workspaceId: id },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
  }

  // Billing — CEO gets full, SUPPORT gets plan+status only
  if (isCeo) {
    result.billing = await prisma.workspaceBilling.findUnique({
      where: { workspaceId: id },
    });
  } else if (isSupport) {
    result.billing = await prisma.workspaceBilling.findUnique({
      where: { workspaceId: id },
      select: { status: true },
    });
  }

  // Quotas — CEO, SUPPORT
  if (isCeo || isSupport) {
    result.quotas = await prisma.workspaceQuota.findUnique({ where: { workspaceId: id } });
  }

  // Daily usage last 7d — CEO, SUPPORT
  if (isCeo || isSupport) {
    const d7 = new Date(Date.now() - 7 * 86_400_000);
    result.dailyUsage = await prisma.workspaceDailyUsage.findMany({
      where: { workspaceId: id, usageDate: { gte: d7 } },
      orderBy: { usageDate: "asc" },
    });
  }

  // Incidents last 20 — CEO, SUPPORT
  if (isCeo || isSupport) {
    result.incidents = await prisma.incident.findMany({
      where: { workspaceId: id },
      select: {
        id: true, title: true, status: true, severity: true,
        category: true, slaState: true, createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }

  // Integrations — CEO, TECH
  if (isCeo || auth.role === "TECH") {
    result.integrations = await prisma.workspaceWebhookIntegration.findMany({
      where: { workspaceId: id },
      select: { type: true, isActive: true, createdAt: true },
    });
    result.aiKeys = await prisma.aiProviderKey.findMany({
      where: { workspaceId: id },
      select: { provider: true, healthStatus: true, lastVerifiedAt: true, lastVerificationError: true },
    });
    result.outboundWebhooks = await prisma.workspaceOutboundWebhook.findMany({
      where: { workspaceId: id },
      select: { name: true, isActive: true, failureCount: true, lastErrorAt: true },
    });
  }

  // Audit logs last 20 — CEO only
  if (isCeo) {
    result.auditLogs = await prisma.auditLog.findMany({
      where: { workspaceId: id },
      include: {
        actorUser: { select: { name: true, email: true } },
        actorApiKey: { select: { name: true, keyPrefix: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }

  // Email logs last 20 — CEO, SUPPORT
  if (isCeo || isSupport) {
    result.emailLogs = await prisma.emailNotificationLog.findMany({
      where: { workspaceId: id },
      select: { id: true, type: true, toEmail: true, status: true, errorMessage: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }

  // Executive snapshot — CEO, SUPPORT
  if (isCeo || isSupport) {
    result.executiveSnapshot = await prisma.workspaceExecutiveSnapshot.findUnique({
      where: { workspaceId: id },
    });
  }

  return NextResponse.json(result);
}
