import { NextRequest, NextResponse } from "next/server";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { forbidden } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) return access.response;
  const auth = access.auth;
  if (auth.kind !== "session") return forbidden();

  const workspace = await prisma.workspace.findUnique({
    where: { id: auth.workspaceId },
    select: {
      planTier: true,
      billing: { select: { status: true } },
    },
  });

  return NextResponse.json({
    status: workspace?.billing?.status ?? "pending",
    plan: workspace?.planTier ?? null,
  });
}
