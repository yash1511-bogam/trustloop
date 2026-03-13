import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { invalidateSessionAuthCache } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { requireApiAuthAndRateLimit, withRateLimitHeaders } from "@/lib/api-guard";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { badRequest, forbidden, notFound } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { setActiveWorkspaceForUser } from "@/lib/workspace-membership";

const switchSchema = z.object({
  workspaceId: z.string().min(10).max(64),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;
  if (auth.kind !== "session") {
    return forbidden();
  }

  const body = await request.json().catch(() => null);
  const parsed = switchSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid workspace switch payload.");
  }

  const switched = await setActiveWorkspaceForUser(prisma, {
    userId: auth.user.id,
    workspaceId: parsed.data.workspaceId,
  });

  if (!switched) {
    return notFound("Workspace membership not found.");
  }

  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (sessionToken) {
    await invalidateSessionAuthCache(sessionToken);
  }

  await recordAuditLog({
    workspaceId: switched.workspace.id,
    actorUserId: auth.user.id,
    action: "workspace.switched",
    targetType: "workspace",
    targetId: switched.workspace.id,
    summary: `Switched active workspace to ${switched.workspace.name}.`,
  });

  return withRateLimitHeaders(
    NextResponse.json({
      workspace: switched.workspace,
      role: switched.membershipRole,
    }),
    access.rateLimit,
  );
}
