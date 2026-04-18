import { NextRequest, NextResponse } from "next/server";
import { requireInternalApiAuth, requireRole } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireInternalApiAuth(request);
  if (!auth || !requireRole(auth, ["CEO", "MARKETING"])) return NextResponse.json(null, { status: 404 });

  const d30 = new Date(Date.now() - 30 * 86_400_000);

  const [
    earlyAccessTotal, earlyAccessVerified,
    inviteTotal, inviteSent, inviteUsed,
    totalUsers, totalWorkspaces,
    trialingActive, trialExpired,
    planDist,
    recentUsers, recentWorkspaces,
  ] = await Promise.all([
    prisma.earlyAccessRequest.count(),
    prisma.earlyAccessRequest.count({ where: { emailVerified: true } }),
    prisma.inviteCode.count(),
    prisma.inviteCode.count({ where: { inviteSentAt: { not: null } } }),
    prisma.inviteCode.count({ where: { used: true } }),
    prisma.user.count(),
    prisma.workspace.count(),
    prisma.workspaceBilling.count({ where: { status: "TRIALING" } }),
    prisma.workspaceBilling.count({ where: { cancelReason: "trial_expired" } }),
    prisma.workspace.groupBy({ by: ["planTier"], _count: true }),
    prisma.user.findMany({
      where: { createdAt: { gte: d30 } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.workspace.findMany({
      where: { createdAt: { gte: d30 } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Group by date
  const groupByDate = (items: { createdAt: Date }[]) => {
    const map: Record<string, number> = {};
    for (const item of items) {
      const day = item.createdAt.toISOString().slice(0, 10);
      map[day] = (map[day] ?? 0) + 1;
    }
    return Object.entries(map).map(([date, count]) => ({ date, count }));
  };

  return NextResponse.json({
    earlyAccess: { total: earlyAccessTotal, verified: earlyAccessVerified, unverified: earlyAccessTotal - earlyAccessVerified },
    inviteCodes: { total: inviteTotal, sent: inviteSent, used: inviteUsed, unused: inviteTotal - inviteUsed },
    signups: { totalUsers, totalWorkspaces, usersByDate: groupByDate(recentUsers), workspacesByDate: groupByDate(recentWorkspaces) },
    trials: { active: trialingActive, expired: trialExpired },
    planDistribution: Object.fromEntries(planDist.map((p) => [p.planTier, p._count])),
  });
}
