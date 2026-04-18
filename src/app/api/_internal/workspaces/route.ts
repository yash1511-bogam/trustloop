import { NextRequest, NextResponse } from "next/server";
import { requireInternalApiAuth, requireRole } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireInternalApiAuth(request);
  if (!auth || !requireRole(auth, ["CEO", "SUPPORT", "TECH"])) {
    return NextResponse.json(null, { status: 404 });
  }

  const url = request.nextUrl;
  const search = url.searchParams.get("search")?.trim() || "";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 20));
  const plan = url.searchParams.get("plan") || undefined;
  const blocked = url.searchParams.get("blocked");

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
      { users: { some: { email: { contains: search, mode: "insensitive" } } } },
    ];
  }
  if (plan) where.planTier = plan;
  if (blocked === "true") where.blockedAt = { not: null };
  if (blocked === "false") where.blockedAt = null;

  const [total, workspaces] = await Promise.all([
    prisma.workspace.count({ where }),
    prisma.workspace.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        planTier: true,
        trialEndsAt: true,
        blockedAt: true,
        blockReason: true,
        createdAt: true,
        _count: { select: { users: true, incidents: true } },
        billing: { select: { status: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    total,
    page,
    limit,
    workspaces: workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      slug: w.slug,
      planTier: w.planTier,
      trialEndsAt: w.trialEndsAt,
      blockedAt: w.blockedAt,
      blockReason: w.blockReason,
      createdAt: w.createdAt,
      userCount: w._count.users,
      incidentCount: w._count.incidents,
      billingStatus: w.billing?.status ?? "NONE",
    })),
  });
}
