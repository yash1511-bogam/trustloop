import { NextRequest, NextResponse } from "next/server";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
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

  const members = await prisma.user.findMany({
    where: { workspaceId: auth.workspaceId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({
    members: members.map((member) => ({
      ...member,
      createdAt: member.createdAt.toISOString(),
    })),
  });
}
