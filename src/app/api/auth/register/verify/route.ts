import { NextRequest, NextResponse } from "next/server";
import { AiProvider, Role, WorkflowType } from "@prisma/client";
import { z } from "zod";
import { setSessionCookie } from "@/lib/cookies";
import { sendGettingStartedGuideEmail, sendWelcomeEmail } from "@/lib/email";
import { badRequest } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { redisDelete, redisGetJson } from "@/lib/redis";
import { authenticateEmailOtp } from "@/lib/stytch";

const registerVerifySchema = z.object({
  methodId: z.string().min(6).max(200),
  code: z.string().min(4).max(12),
});

type PendingRegisterPayload = {
  name: string;
  email: string;
  workspaceName: string;
  stytchUserId: string;
};

function pendingRegisterKey(methodId: string): string {
  return `auth:register:${methodId}`;
}

function startOfUtcDay(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const parsed = registerVerifySchema.safeParse(body);

  if (!parsed.success) {
    return badRequest("Invalid registration verification payload.");
  }

  const pending = await redisGetJson<PendingRegisterPayload>(
    pendingRegisterKey(parsed.data.methodId),
  );

  if (!pending) {
    return NextResponse.json(
      { error: "Registration session expired. Start registration again." },
      { status: 400 },
    );
  }

  try {
    const authResult = await authenticateEmailOtp({
      methodId: parsed.data.methodId,
      code: parsed.data.code.trim(),
    });

    if (authResult.stytchUserId !== pending.stytchUserId) {
      return NextResponse.json(
        { error: "Stytch identity mismatch. Restart registration." },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: pending.email },
          { stytchUserId: authResult.stytchUserId },
        ],
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with that identity already exists." },
        { status: 409 },
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: pending.workspaceName,
        },
      });

      const createdUser = await tx.user.create({
        data: {
          workspaceId: workspace.id,
          email: pending.email,
          name: pending.name,
          role: Role.OWNER,
          stytchUserId: authResult.stytchUserId,
        },
      });

      await tx.workflowSetting.createMany({
        data: [
          {
            workspaceId: workspace.id,
            workflowType: WorkflowType.INCIDENT_TRIAGE,
            provider: AiProvider.OPENAI,
            model: "gpt-4o-mini",
          },
          {
            workspaceId: workspace.id,
            workflowType: WorkflowType.CUSTOMER_UPDATE,
            provider: AiProvider.OPENAI,
            model: "gpt-4o-mini",
          },
        ],
      });

      await tx.workspaceQuota.create({
        data: {
          workspaceId: workspace.id,
        },
      });

      await tx.workspaceDailyUsage.upsert({
        where: {
          workspaceId_usageDate: {
            workspaceId: workspace.id,
            usageDate: startOfUtcDay(),
          },
        },
        create: {
          workspaceId: workspace.id,
          usageDate: startOfUtcDay(),
        },
        update: {},
      });

      return { user: createdUser, workspace };
    });

    await redisDelete(pendingRegisterKey(parsed.data.methodId));

    await sendWelcomeEmail({
      workspaceId: created.workspace.id,
      toEmail: created.user.email,
      workspaceName: created.workspace.name,
      userName: created.user.name,
    }).catch(() => null);

    await sendGettingStartedGuideEmail({
      workspaceId: created.workspace.id,
      toEmail: created.user.email,
      workspaceName: created.workspace.name,
      userName: created.user.name,
    }).catch(() => null);

    const response = NextResponse.json({
      user: {
        id: created.user.id,
        email: created.user.email,
        name: created.user.name,
      },
    });

    setSessionCookie(response, authResult.sessionToken, authResult.expiresAt);

    return response;
  } catch {
    return NextResponse.json({ error: "Invalid or expired verification code." }, { status: 401 });
  }
}
