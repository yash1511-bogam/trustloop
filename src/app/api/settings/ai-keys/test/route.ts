import { NextRequest, NextResponse } from "next/server";
import { AiProvider } from "@prisma/client";
import { z } from "zod";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { last4 } from "@/lib/encryption";
import { featureGateError } from "@/lib/feature-gate";
import { isWorkspaceFeatureAllowed } from "@/lib/feature-gate-server";
import { badRequest } from "@/lib/http";
import { testProviderKey } from "@/lib/ai/service";
import { prisma } from "@/lib/prisma";

const testSchema = z.object({
  provider: z.nativeEnum(AiProvider),
  apiKey: z.string().min(8).max(512),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) {
    return access.response;
  }
  if (access.auth.kind !== "session") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const auth = access.auth;
  if (!(await isWorkspaceFeatureAllowed(auth.workspaceId, "ai_keys"))) {
    return NextResponse.json({ error: featureGateError("ai_keys") }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = testSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid key test payload.");
  }

  const result = await testProviderKey({
    provider: parsed.data.provider,
    apiKey: parsed.data.apiKey.trim(),
  });

  await prisma.aiProviderKey.updateMany({
    where: {
      workspaceId: auth.workspaceId,
      provider: parsed.data.provider,
      keyLast4: last4(parsed.data.apiKey.trim()),
    },
    data: {
      healthStatus: result.success ? "OK" : "FAILED",
      lastVerifiedAt: new Date(),
      lastVerificationError: result.success ? null : result.message.slice(0, 500),
      isActive: result.success ? true : undefined,
    },
  });

  return NextResponse.json(result, {
    status: result.success ? 200 : 400,
  });
}
