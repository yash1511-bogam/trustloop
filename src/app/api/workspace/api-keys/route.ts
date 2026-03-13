import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { hasRole } from "@/lib/auth";
import { createWorkspaceApiKey } from "@/lib/api-key-auth";
import { requireApiAuthAndRateLimit, withRateLimitHeaders } from "@/lib/api-guard";
import { badRequest, forbidden, notFound } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { verifyTurnstileToken } from "@/lib/turnstile";

const createSchema = z.object({
  name: z.string().min(2).max(120),
  turnstileToken: z.string().min(1).optional().nullable(),
});

const revokeSchema = z.object({
  id: z.string().min(10).max(40),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;

  if (auth.kind !== "session") {
    return forbidden();
  }

  const keys = await prisma.workspaceApiKey.findMany({
    where: { workspaceId: auth.workspaceId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      isActive: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });

  return withRateLimitHeaders(
    NextResponse.json({
      keys: keys.map((key) => ({
        ...key,
        createdAt: key.createdAt.toISOString(),
        lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
      })),
    }),
    access.rateLimit,
  );
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
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid API key payload.");
  }

  const turnstile = await verifyTurnstileToken({
    request,
    token: parsed.data.turnstileToken,
  });
  if (!turnstile.success) {
    return NextResponse.json(
      { error: "Security verification failed. Try again." },
      { status: 400 },
    );
  }

  const created = await createWorkspaceApiKey({
    workspaceId: auth.workspaceId,
    name: parsed.data.name,
  });

  return withRateLimitHeaders(
    NextResponse.json(
      {
        key: {
          id: created.id,
          keyPrefix: created.keyPrefix,
          createdAt: created.createdAt.toISOString(),
        },
        apiKey: created.apiKey,
        message: "Copy this API key now. It will not be shown again.",
      },
      { status: 201 },
    ),
    access.rateLimit,
  );
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
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
  const parsed = revokeSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid API key revoke payload.");
  }

  const updated = await prisma.workspaceApiKey.updateMany({
    where: {
      id: parsed.data.id,
      workspaceId: auth.workspaceId,
      isActive: true,
    },
    data: {
      isActive: false,
    },
  });

  if (updated.count === 0) {
    return notFound("API key not found.");
  }

  return withRateLimitHeaders(
    NextResponse.json({ success: true }),
    access.rateLimit,
  );
}
