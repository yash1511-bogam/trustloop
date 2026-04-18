import { NextRequest, NextResponse } from "next/server";
import { requireInternalApiAuth, requireRole } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireInternalApiAuth(request);
  if (!auth || !requireRole(auth, ["CEO", "MARKETING"])) return NextResponse.json(null, { status: 404 });

  const usage = await prisma.workspaceBilling.findMany({
    where: { discountCode: { not: null } },
    select: {
      workspaceId: true, discountCode: true, status: true,
      lastPaymentAt: true, lastPaymentAmount: true,
      workspace: { select: { name: true } },
    },
    orderBy: { lastPaymentAt: "desc" },
  });

  return NextResponse.json({
    usage: usage.map((u) => ({
      workspaceId: u.workspaceId, workspaceName: u.workspace.name,
      discountCode: u.discountCode, status: u.status,
      lastPaymentAt: u.lastPaymentAt, lastPaymentAmount: u.lastPaymentAmount,
    })),
  });
}
