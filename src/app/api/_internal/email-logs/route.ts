import { NextRequest, NextResponse } from "next/server";
import { requireInternalApiAuth, requireRole } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireInternalApiAuth(request);
  if (!auth || !requireRole(auth, ["CEO", "SUPPORT", "TECH", "MARKETING"])) {
    return NextResponse.json(null, { status: 404 });
  }

  const url = request.nextUrl;
  const workspaceId = url.searchParams.get("workspaceId") || undefined;
  const type = url.searchParams.get("type") || undefined;
  const status = url.searchParams.get("status") || undefined;
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));

  // SUPPORT must provide workspaceId
  if (auth.role === "SUPPORT" && !workspaceId) {
    return NextResponse.json({ error: "workspaceId required for SUPPORT role" }, { status: 400 });
  }

  // TECH and MARKETING get aggregate only — return counts, no individual emails
  if (auth.role === "TECH" || auth.role === "MARKETING") {
    const d24h = new Date(Date.now() - 24 * 3_600_000);
    const [total, sent, failed, byType] = await Promise.all([
      prisma.emailNotificationLog.count({ where: { createdAt: { gte: d24h } } }),
      prisma.emailNotificationLog.count({ where: { createdAt: { gte: d24h }, status: "SENT" } }),
      prisma.emailNotificationLog.count({ where: { createdAt: { gte: d24h }, status: "FAILED" } }),
      prisma.emailNotificationLog.groupBy({ by: ["type"], where: { createdAt: { gte: d24h } }, _count: true }),
    ]);
    return NextResponse.json({ aggregate: true, last24h: { total, sent, failed }, byType: byType.map((g) => ({ type: g.type, count: g._count })) });
  }

  // CEO and SUPPORT get full logs
  const where: Record<string, unknown> = {};
  if (workspaceId) where.workspaceId = workspaceId;
  if (type) where.type = type;
  if (status) where.status = status;

  const [total, logs] = await Promise.all([
    prisma.emailNotificationLog.count({ where }),
    prisma.emailNotificationLog.findMany({
      where,
      select: {
        id: true, workspaceId: true, type: true, toEmail: true,
        status: true, errorMessage: true, createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({ total, page, limit, logs });
}
