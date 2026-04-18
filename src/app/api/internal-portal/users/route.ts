import { NextRequest, NextResponse } from "next/server";
import { requireInternalApiAuth, requireRole } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireInternalApiAuth(request);
  if (!auth || !requireRole(auth, ["CEO", "SUPPORT"])) return NextResponse.json(null, { status: 404 });

  const url = request.nextUrl;
  const search = url.searchParams.get("search")?.trim() || "";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 20));

  const where = search
    ? { OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
      ] }
    : {};

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, role: true, createdAt: true,
        workspaceId: true,
        workspace: { select: { name: true, slug: true, planTier: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    total, page, limit,
    users: users.map((u) => ({
      id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt,
      workspaceId: u.workspaceId, workspaceName: u.workspace.name,
      workspaceSlug: u.workspace.slug, workspacePlanTier: u.workspace.planTier,
    })),
  });
}
