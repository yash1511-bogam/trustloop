import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { hasRole } from "@/lib/auth";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { testProviderKey } from "@/lib/ai/service";
import { decryptSecret } from "@/lib/encryption";
import { sendAiKeyHealthAlertEmail } from "@/lib/email";
import { forbidden } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.AI_KEY_HEALTH_CRON_SECRET;
  const cronHeader = request.headers.get("x-cron-secret");
  const isCron = Boolean(cronSecret && cronHeader === cronSecret);

  let workspaceScope: string | null = null;

  if (!isCron) {
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
    workspaceScope = auth.workspaceId;
  }

  const keys = await prisma.aiProviderKey.findMany({
    where: {
      isActive: true,
      workspaceId: workspaceScope ?? undefined,
    },
    include: {
      workspace: {
        select: {
          users: {
            where: {
              role: { in: [Role.OWNER, Role.MANAGER] },
            },
            select: {
              email: true,
            },
          },
        },
      },
    },
    orderBy: [{ workspaceId: "asc" }, { provider: "asc" }],
  });

  const results: Array<{
    workspaceId: string;
    provider: string;
    success: boolean;
    message: string;
  }> = [];

  for (const key of keys) {
    const tested = await testProviderKey({
      provider: key.provider,
      apiKey: decryptSecret(key.encryptedKey),
    });

    await prisma.aiProviderKey.update({
      where: { id: key.id },
      data: {
        healthStatus: tested.success ? "OK" : "FAILED",
        lastVerifiedAt: new Date(),
        lastVerificationError: tested.success ? null : tested.message.slice(0, 500),
        isActive: tested.success ? true : false,
      },
    });

    if (!tested.success) {
      const recipients = key.workspace.users.map((user) => user.email);
      for (const email of recipients) {
        await sendAiKeyHealthAlertEmail({
          workspaceId: key.workspaceId,
          toEmail: email,
          provider: key.provider,
          detail: tested.message,
        }).catch(() => null);
      }
    }

    results.push({
      workspaceId: key.workspaceId,
      provider: key.provider,
      success: tested.success,
      message: tested.message,
    });
  }

  return NextResponse.json({
    checked: results.length,
    results,
  });
}
