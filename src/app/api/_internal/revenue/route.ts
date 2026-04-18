import { NextRequest, NextResponse } from "next/server";
import { requireInternalApiAuth, requireRole } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireInternalApiAuth(request);
  if (!auth || !requireRole(auth, ["CEO"])) return NextResponse.json(null, { status: 404 });

  const d30 = new Date(Date.now() - 30 * 86_400_000);

  const [activeBilling, canceledLast30d, failedPayments, recentPayments, promoUsage] =
    await Promise.all([
      prisma.workspaceBilling.findMany({
        where: { status: "ACTIVE" },
        select: {
          workspaceId: true,
          lastPaymentAmount: true,
          lastPaymentCurrency: true,
          dodoProductId: true,
          workspace: { select: { planTier: true } },
        },
      }),
      prisma.workspaceBilling.count({ where: { canceledAt: { gte: d30 } } }),
      prisma.workspaceBilling.count({ where: { paymentFailedAt: { not: null } } }),
      prisma.billingEventLog.findMany({
        where: { eventType: { contains: "payment" } },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          workspaceId: true,
          eventType: true,
          amount: true,
          currency: true,
          processStatus: true,
          createdAt: true,
        },
      }),
      prisma.workspaceBilling.groupBy({
        by: ["discountCode"],
        where: { discountCode: { not: null } },
        _count: true,
      }),
    ]);

  const mrr = activeBilling.reduce((sum, b) => sum + (b.lastPaymentAmount ?? 0), 0);
  const revenueByPlan = { starter: 0, pro: 0, enterprise: 0 };
  for (const b of activeBilling) {
    const tier = b.workspace.planTier as keyof typeof revenueByPlan;
    if (tier in revenueByPlan) revenueByPlan[tier]++;
  }

  return NextResponse.json({
    mrr,
    revenueByPlan,
    canceledLast30d,
    failedPayments,
    recentPayments,
    promoCodeUsage: promoUsage
      .filter((g) => g.discountCode)
      .map((g) => ({ code: g.discountCode, count: g._count })),
  });
}
