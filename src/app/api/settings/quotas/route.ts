import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { hasRole } from "@/lib/auth";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { badRequest, forbidden } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { redisDelete } from "@/lib/redis";

const quotaSchema = z.object({
  apiRequestsPerMinute: z.int().min(10).max(5000),
  incidentsPerDay: z.int().min(10).max(100000),
  triageRunsPerDay: z.int().min(10).max(100000),
  customerUpdatesPerDay: z.int().min(10).max(100000),
  reminderEmailsPerDay: z.int().min(10).max(100000),
  reminderIntervalHoursP1: z.int().min(1).max(168).optional(),
  reminderIntervalHoursP2: z.int().min(1).max(336).optional(),
  onCallRotationEnabled: z.boolean().optional(),
  onCallRotationIntervalHours: z.int().min(1).max(168).optional(),
  onCallRotationAnchorAt: z.string().datetime().optional(),
});

function quotaCacheKey(workspaceId: string): string {
  return `quota:policy:${workspaceId}`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) {
    return access.response;
  }

  const auth = access.auth;
  if (auth.kind !== "session") {
    return forbidden();
  }

  const quota = await prisma.workspaceQuota.upsert({
    where: { workspaceId: auth.workspaceId },
    create: { workspaceId: auth.workspaceId },
    update: {},
  });

  return NextResponse.json({ quota });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) {
    return access.response;
  }

  const auth = access.auth;
  if (auth.kind !== "session") {
    return forbidden();
  }
  if (!hasRole({ user: auth.user }, [Role.OWNER, Role.MANAGER])) {
    return forbidden();
  }

  const body = await request.json().catch(() => null);
  const parsed = quotaSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid quota payload.");
  }

  const quota = await prisma.workspaceQuota.upsert({
    where: { workspaceId: auth.workspaceId },
    create: {
      workspaceId: auth.workspaceId,
      ...parsed.data,
      onCallRotationAnchorAt: parsed.data.onCallRotationAnchorAt
        ? new Date(parsed.data.onCallRotationAnchorAt)
        : undefined,
    },
    update: {
      ...parsed.data,
      onCallRotationAnchorAt: parsed.data.onCallRotationAnchorAt
        ? new Date(parsed.data.onCallRotationAnchorAt)
        : undefined,
    },
  });

  await redisDelete(quotaCacheKey(auth.workspaceId));

  return NextResponse.json({ quota });
}
