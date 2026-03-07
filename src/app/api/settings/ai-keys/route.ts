import { NextRequest, NextResponse } from "next/server";
import { AiProvider } from "@prisma/client";
import { z } from "zod";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { encryptSecret, last4 } from "@/lib/encryption";
import { badRequest } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const saveKeySchema = z.object({
  provider: z.nativeEnum(AiProvider),
  apiKey: z.string().min(8).max(512),
  isActive: z.boolean().optional(),
});

export async function GET(): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit();
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;

  const keys = await prisma.aiProviderKey.findMany({
    where: { workspaceId: auth.user.workspaceId },
    orderBy: { provider: "asc" },
    select: {
      provider: true,
      keyLast4: true,
      isActive: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ keys });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit();
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;

  const body = await request.json().catch(() => null);
  const parsed = saveKeySchema.safeParse(body);

  if (!parsed.success) {
    return badRequest("Invalid key payload.");
  }

  const encrypted = encryptSecret(parsed.data.apiKey.trim());

  const key = await prisma.aiProviderKey.upsert({
    where: {
      workspaceId_provider: {
        workspaceId: auth.user.workspaceId,
        provider: parsed.data.provider,
      },
    },
    create: {
      workspaceId: auth.user.workspaceId,
      provider: parsed.data.provider,
      encryptedKey: encrypted,
      keyLast4: last4(parsed.data.apiKey),
      isActive: parsed.data.isActive ?? true,
    },
    update: {
      encryptedKey: encrypted,
      keyLast4: last4(parsed.data.apiKey),
      isActive: parsed.data.isActive ?? true,
    },
    select: {
      provider: true,
      keyLast4: true,
      isActive: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ key }, { status: 201 });
}
