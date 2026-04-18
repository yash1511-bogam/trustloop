import { NextRequest, NextResponse } from "next/server";
import { requireInternalApiAuth } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireInternalApiAuth(request);
  if (!auth) return NextResponse.json(null, { status: 404 });

  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 86_400_000);
  const d30 = new Date(now.getTime() - 30 * 86_400_000);

  const [
    totalWorkspaces,
    totalUsers,
    totalIncidents,
    incidentsLast7d,
    incidentsLast30d,
    activeSubscriptions,
    trialingWorkspaces,
    blockedWorkspaces,
    earlyAccessRequests,
    earlyAccessVerified,
    inviteCodesCreated,
    inviteCodesUsed,
    enterpriseInquiries,
  ] = await Promise.all([
    prisma.workspace.count(),
    prisma.user.count(),
    prisma.incident.count(),
    prisma.incident.count({ where: { createdAt: { gte: d7 } } }),
    prisma.incident.count({ where: { createdAt: { gte: d30 } } }),
    prisma.workspaceBilling.count({ where: { status: "ACTIVE" } }),
    prisma.workspaceBilling.count({ where: { status: "TRIALING" } }),
    prisma.workspace.count({ where: { blockedAt: { not: null } } }),
    prisma.earlyAccessRequest.count(),
    prisma.earlyAccessRequest.count({ where: { emailVerified: true } }),
    prisma.inviteCode.count(),
    prisma.inviteCode.count({ where: { used: true } }),
    prisma.enterpriseContactInquiry.count(),
  ]);

  return NextResponse.json({
    totalWorkspaces,
    totalUsers,
    totalIncidents,
    incidentsLast7d,
    incidentsLast30d,
    activeSubscriptions,
    trialingWorkspaces,
    blockedWorkspaces,
    earlyAccessRequests,
    earlyAccessVerified,
    inviteCodesCreated,
    inviteCodesUsed,
    enterpriseInquiries,
  });
}
