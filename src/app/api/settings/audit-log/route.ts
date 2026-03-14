import { NextRequest, NextResponse } from "next/server";
import { requireApiAuthAndRateLimit, withRateLimitHeaders } from "@/lib/api-guard";
import { forbidden } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) return access.response;
  const auth = access.auth;
  if (auth.kind !== "session") return forbidden();

  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
  const action = url.searchParams.get("action");
  const actorUserId = url.searchParams.get("actorUserId");

  const where: Record<string, unknown> = { workspaceId: auth.workspaceId };
  if (action) where.action = { startsWith: action };
  if (actorUserId) where.actorUserId = actorUserId;
  if (cursor) where.createdAt = { lt: new Date(cursor) };

  const logs = await prisma.auditLog.findMany({
    where,
    include: {
      actorUser: { select: { id: true, name: true, email: true } },
      actorApiKey: { select: { id: true, name: true, keyPrefix: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
  });

  const hasMore = logs.length > limit;
  const items = hasMore ? logs.slice(0, limit) : logs;
  const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;

  return withRateLimitHeaders(
    NextResponse.json({ items, nextCursor }),
    access.rateLimit,
  );
}
