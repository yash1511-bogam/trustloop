import { NextRequest, NextResponse } from "next/server";
import { AiProvider, Role, WorkflowType } from "@prisma/client";
import { z } from "zod";
import { setSessionCookie } from "@/lib/cookies";
import { sendGettingStartedGuideEmail, sendWelcomeEmail } from "@/lib/email";
import { badRequest } from "@/lib/http";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { redisDelete, redisGetJson } from "@/lib/redis";
import { authenticateEmailOtp } from "@/lib/stytch";
import { createWorkspaceWithGeneratedSlug, ensureWorkspaceSlug } from "@/lib/workspace-slug";

const registerVerifySchema = z.object({
  methodId: z.string().min(6).max(200),
  code: z.string().min(4).max(12),
});

type PendingRegisterPayload = {
  name: string;
  email: string;
  workspaceName: string;
  expectedStytchUserId?: string;
  inviteToken?: string;
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
      intent: "register",
      organizationName: pending.workspaceName,
    });

    if (pending.expectedStytchUserId && authResult.stytchUserId !== pending.expectedStytchUserId) {
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
      if (pending.inviteToken) {
        const invite = await tx.workspaceInvite.findUnique({
          where: { token: pending.inviteToken },
          include: {
            workspace: true,
          },
        });

        if (!invite || invite.usedAt || invite.expiresAt <= new Date()) {
          throw new Error("Invite is invalid or expired.");
        }

        if (invite.email.toLowerCase() !== pending.email.toLowerCase()) {
          throw new Error("Invite email mismatch.");
        }

        const createdUser = await tx.user.create({
          data: {
            workspaceId: invite.workspaceId,
            email: pending.email,
            name: pending.name,
            role: invite.role,
            stytchUserId: authResult.stytchUserId,
          },
        });

        await tx.workspaceInvite.update({
          where: { id: invite.id },
          data: {
            usedAt: new Date(),
          },
        });

        await ensureWorkspaceSlug(tx, invite.workspace.id, invite.workspace.name);

        return { user: createdUser, workspace: invite.workspace };
      }

      const workspace = await createWorkspaceWithGeneratedSlug(tx, pending.workspaceName);

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

    try {
      await sendWelcomeEmail({
        workspaceId: created.workspace.id,
        toEmail: created.user.email,
        workspaceName: created.workspace.name,
        userName: created.user.name,
      });
    } catch (error) {
      log.auth.error("Failed to send post-registration welcome email", {
        workspaceId: created.workspace.id,
        toEmail: created.user.email,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    try {
      await sendGettingStartedGuideEmail({
        workspaceId: created.workspace.id,
        toEmail: created.user.email,
        workspaceName: created.workspace.name,
        userName: created.user.name,
      });
    } catch (error) {
      log.auth.error("Failed to send post-registration getting started email", {
        workspaceId: created.workspace.id,
        toEmail: created.user.email,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const response = NextResponse.json({
      user: {
        id: created.user.id,
        email: created.user.email,
        name: created.user.name,
      },
    });

    setSessionCookie(response, authResult.sessionToken, authResult.expiresAt);

    return response;
  } catch (error) {
    log.auth.error("Failed to verify registration OTP", {
      methodId: parsed.data.methodId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Invalid or expired verification code." }, { status: 401 });
  }
}
