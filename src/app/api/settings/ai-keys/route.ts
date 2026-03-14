import { NextRequest, NextResponse } from "next/server";
import { AiProvider } from "@prisma/client";
import { z } from "zod";
import { recordAuditForAccess } from "@/lib/audit";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { encryptSecret, last4 } from "@/lib/encryption";
import { featureGateError } from "@/lib/feature-gate";
import { isWorkspaceFeatureAllowed } from "@/lib/feature-gate-server";
import { badRequest } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const saveKeySchema = z.object({
  provider: z.nativeEnum(AiProvider),
  apiKey: z.string().min(8).max(512),
  isActive: z.boolean().optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;
  if (auth.kind !== "session") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!(await isWorkspaceFeatureAllowed(auth.workspaceId, "ai_keys"))) {
    return NextResponse.json({ error: featureGateError("ai_keys") }, { status: 403 });
  }

  const keys = await prisma.aiProviderKey.findMany({
    where: { workspaceId: auth.workspaceId },
    orderBy: { provider: "asc" },
    select: {
      provider: true,
      keyLast4: true,
      isActive: true,
      healthStatus: true,
      lastVerifiedAt: true,
      lastVerificationError: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ keys });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;
  if (auth.kind !== "session") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!(await isWorkspaceFeatureAllowed(auth.workspaceId, "ai_keys"))) {
    return NextResponse.json({ error: featureGateError("ai_keys") }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = saveKeySchema.safeParse(body);

  if (!parsed.success) {
    return badRequest("Invalid key payload.");
  }

  const encrypted = encryptSecret(parsed.data.apiKey.trim());

  const key = await prisma.aiProviderKey.upsert({
    where: {
      workspaceId_provider: {
        workspaceId: auth.workspaceId,
        provider: parsed.data.provider,
      },
    },
    create: {
      workspaceId: auth.workspaceId,
      provider: parsed.data.provider,
      encryptedKey: encrypted,
      keyLast4: last4(parsed.data.apiKey),
      isActive: parsed.data.isActive ?? true,
      healthStatus: "UNKNOWN",
      lastVerifiedAt: null,
      lastVerificationError: null,
    },
    update: {
      encryptedKey: encrypted,
      keyLast4: last4(parsed.data.apiKey),
      isActive: parsed.data.isActive ?? true,
      healthStatus: "UNKNOWN",
      lastVerifiedAt: null,
      lastVerificationError: null,
    },
    select: {
      provider: true,
      keyLast4: true,
      isActive: true,
      healthStatus: true,
      lastVerifiedAt: true,
      lastVerificationError: true,
      updatedAt: true,
    },
  });

  recordAuditForAccess({
    access: auth,
    request,
    action: "ai_key.saved",
    targetType: "AiProviderKey",
    summary: `AI key saved for ${parsed.data.provider} (****${last4(parsed.data.apiKey)})`,
  }).catch(() => {});

  return NextResponse.json({ key }, { status: 201 });
}
