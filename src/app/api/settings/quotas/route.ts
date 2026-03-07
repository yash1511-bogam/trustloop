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
});

function quotaCacheKey(workspaceId: string): string {
  return `quota:policy:${workspaceId}`;
}

export async function GET(): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit();
  if (access.response) {
    return access.response;
  }

  const auth = access.auth;

  const quota = await prisma.workspaceQuota.upsert({
    where: { workspaceId: auth.user.workspaceId },
    create: { workspaceId: auth.user.workspaceId },
    update: {},
  });

  return NextResponse.json({ quota });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit();
  if (access.response) {
    return access.response;
  }

  const auth = access.auth;
  if (!hasRole(auth, [Role.OWNER, Role.MANAGER])) {
    return forbidden();
  }

  const body = await request.json().catch(() => null);
  const parsed = quotaSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid quota payload.");
  }

  const quota = await prisma.workspaceQuota.upsert({
    where: { workspaceId: auth.user.workspaceId },
    create: {
      workspaceId: auth.user.workspaceId,
      ...parsed.data,
    },
    update: {
      ...parsed.data,
    },
  });

  await redisDelete(quotaCacheKey(auth.user.workspaceId));

  return NextResponse.json({ quota });
}
