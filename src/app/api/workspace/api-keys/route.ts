import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { hasRole } from "@/lib/auth";
import { recordAuditForAccess } from "@/lib/audit";
import { createWorkspaceApiKey } from "@/lib/api-key-auth";
import { requireApiAuthAndRateLimit, withRateLimitHeaders } from "@/lib/api-guard";
import {
  API_KEY_ASSIGNABLE_SCOPES,
  API_KEY_EXPIRY_OPTION_IDS,
  API_KEY_USAGE_PRESET_IDS,
  normalizeApiKeyScopes,
  resolveApiKeyExpiryDate,
  scopesForApiKeyUsagePreset,
} from "@/lib/api-key-scopes";
import { badRequest, forbidden, notFound } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { verifyTurnstileToken } from "@/lib/turnstile";

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  usagePreset: z.enum(API_KEY_USAGE_PRESET_IDS).optional().nullable(),
  scopes: z.array(z.enum(API_KEY_ASSIGNABLE_SCOPES)).min(1).max(API_KEY_ASSIGNABLE_SCOPES.length).optional(),
  expiryOption: z.enum(API_KEY_EXPIRY_OPTION_IDS).optional().nullable(),
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
      scopes: true,
      isActive: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
    },
  });

  return withRateLimitHeaders(
    NextResponse.json({
      keys: keys.map((key) => ({
        ...key,
        scopes: normalizeApiKeyScopes(key.scopes),
        createdAt: key.createdAt.toISOString(),
        lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
        expiresAt: key.expiresAt?.toISOString() ?? null,
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
    scopes:
      parsed.data.scopes ??
      (parsed.data.usagePreset ? scopesForApiKeyUsagePreset(parsed.data.usagePreset) : undefined),
    expiresAt: resolveApiKeyExpiryDate(parsed.data.expiryOption),
  });

  await recordAuditForAccess({
    access: auth,
    request,
    action: "workspace.api_key.created",
    targetType: "workspace_api_key",
    targetId: created.id,
    summary: `Created API key ${parsed.data.name.trim()}`,
    metadata: {
      keyPrefix: created.keyPrefix,
      scopes:
        parsed.data.scopes ??
        (parsed.data.usagePreset ? scopesForApiKeyUsagePreset(parsed.data.usagePreset) : undefined) ??
        normalizeApiKeyScopes(undefined),
      expiryOption: parsed.data.expiryOption ?? null,
      expiresAt: created.expiresAt?.toISOString() ?? null,
      usagePreset: parsed.data.usagePreset ?? null,
    },
  });

  return withRateLimitHeaders(
    NextResponse.json(
      {
        key: {
          id: created.id,
          keyPrefix: created.keyPrefix,
          createdAt: created.createdAt.toISOString(),
          expiresAt: created.expiresAt?.toISOString() ?? null,
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

  const existing = await prisma.workspaceApiKey.findFirst({
    where: {
      id: parsed.data.id,
      workspaceId: auth.workspaceId,
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      expiresAt: true,
      isActive: true,
    },
  });

  if (!existing || !existing.isActive) {
    return notFound("API key not found.");
  }

  const updated = await prisma.workspaceApiKey.updateMany({
    where: {
      id: existing.id,
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

  await recordAuditForAccess({
    access: auth,
    request,
    action: "workspace.api_key.revoked",
    targetType: "workspace_api_key",
    targetId: existing.id,
    summary: `Revoked API key ${existing.name}`,
    metadata: {
      keyPrefix: existing.keyPrefix,
      scopes: normalizeApiKeyScopes(existing.scopes),
      expiresAt: existing.expiresAt?.toISOString() ?? null,
    },
  });

  return withRateLimitHeaders(
    NextResponse.json({ success: true }),
    access.rateLimit,
  );
}
