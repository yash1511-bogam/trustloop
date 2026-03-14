import { NextRequest, NextResponse } from "next/server";
import { requireApiAuthAndRateLimit, withRateLimitHeaders } from "@/lib/api-guard";
import { recordAuditForAccess } from "@/lib/audit";
import { forbidden } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;
  if (auth.kind !== "session") {
    return forbidden();
  }

  recordAuditForAccess({ access: access.auth, request, action: "workspace.members_list", targetType: "workspace", summary: "Listed workspace members" }).catch(() => {});

  const members = await prisma.workspaceMembership.findMany({
    where: { workspaceId: auth.workspaceId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
        },
      },
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  return withRateLimitHeaders(
    NextResponse.json({
      members: members.map((member) => ({
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        phone: member.user.phone,
        role: member.role,
        createdAt: member.user.createdAt.toISOString(),
      })),
    }),
    access.rateLimit,
  );
}
