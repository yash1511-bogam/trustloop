import { NextRequest, NextResponse } from "next/server";
import { requireInternalApiAuth, requireRole } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

const TECH_ACTIONS = ["billing.", "webhook.", "api_key.", "integration.", "workspace.delete"];

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireInternalApiAuth(request);
  if (!auth || !requireRole(auth, ["CEO", "TECH"])) return NextResponse.json(null, { status: 404 });

  const url = request.nextUrl;
  const workspaceId = url.searchParams.get("workspaceId") || undefined;
  const action = url.searchParams.get("action") || undefined;
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 50));

  const where: Record<string, unknown> = {};
  if (workspaceId) where.workspaceId = workspaceId;
  if (action) where.action = { contains: action };
  // TECH can only see system-level actions
  if (auth.role === "TECH") {
    where.action = { in: TECH_ACTIONS.flatMap((prefix) =>
      // Use startsWith via Prisma — approximate with contains
      [prefix]
    ) };
    // Override with startsWith filter
    where.OR = TECH_ACTIONS.map((prefix) => ({ action: { startsWith: prefix } }));
    delete where.action;
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: {
        actorUser: { select: { name: true, email: true } },
        actorApiKey: { select: { name: true, keyPrefix: true } },
        workspace: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    total, page, limit,
    logs: logs.map((l) => ({
      id: l.id, workspaceId: l.workspaceId, workspaceName: l.workspace.name,
      action: l.action, targetType: l.targetType, targetId: l.targetId,
      summary: l.summary, ipAddress: l.ipAddress, createdAt: l.createdAt,
      actor: l.actorUser
        ? { type: "user", name: l.actorUser.name, email: l.actorUser.email }
        : l.actorApiKey
          ? { type: "api_key", name: l.actorApiKey.name, keyPrefix: l.actorApiKey.keyPrefix }
          : null,
    })),
  });
}
