import { NextRequest, NextResponse } from "next/server";
import { AiProvider, Role, WorkflowType } from "@prisma/client";
import { z } from "zod";
import {
  clearAuthEmailOtp,
  localAuthIdentityForEmail,
  verifyAuthEmailOtp,
} from "@/lib/auth-email-otp";
import { issueAppSession } from "@/lib/app-session";
import { recordAuditLog } from "@/lib/audit";
import { requestIpAddress } from "@/lib/api-key-scopes";
import { quotasForPlan } from "@/lib/billing-plan";
import { setSessionCookie } from "@/lib/cookies";
import { sendGettingStartedGuideEmail, scheduleWelcomeEmail, upsertEmailSubscription } from "@/lib/email";
import { badRequest } from "@/lib/http";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { createSampleIncidentsForWorkspace } from "@/lib/onboarding-demo";
import { createWorkspaceWithExactSlug, ensureWorkspaceSlug } from "@/lib/workspace-slug";
import { ensureWorkspaceMembership } from "@/lib/workspace-membership";
import { workspacePath } from "@/lib/workspace-url";

const registerVerifySchema = z.object({
  methodId: z.string().min(6).max(200),
  code: z.string().min(4).max(12),
  plan: z.enum(["starter", "pro"]).optional(),
  interval: z.enum(["monthly", "annual"]).optional(),
});

type PendingRegisterPayload = {
  name: string;
  email: string;
  workspaceName: string;
  inviteToken?: string;
  inviteCode?: string;
};

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

  try {
    const pending = await verifyAuthEmailOtp<PendingRegisterPayload>(
      "register",
      parsed.data.methodId,
      parsed.data.code,
    );
    if (!pending) {
      return NextResponse.json(
        { error: "Registration session expired. Start registration again." },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findFirst({
      where: { email: pending.email },
      select: {
        id: true,
      },
    });

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

        const createdUser = existing
          ? await tx.user.update({
              where: { id: existing.id },
              data: {
                workspaceId: invite.workspaceId,
                role: invite.role,
              },
            })
          : await tx.user.create({
              data: {
                workspaceId: invite.workspaceId,
                email: pending.email,
                name: pending.name,
                role: invite.role,
                stytchUserId: localAuthIdentityForEmail(pending.email),
              },
            });

        await ensureWorkspaceMembership(tx, {
          workspaceId: invite.workspaceId,
          userId: createdUser.id,
          role: invite.role,
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

      const workspace = await createWorkspaceWithExactSlug(tx, pending.workspaceName, {
        planTier: "starter",
      });
      const starterQuota = quotasForPlan("starter");

      const createdUser = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: {
              workspaceId: workspace.id,
              role: Role.OWNER,
            },
          })
        : await tx.user.create({
            data: {
              workspaceId: workspace.id,
              email: pending.email,
              name: pending.name,
              role: Role.OWNER,
              stytchUserId: localAuthIdentityForEmail(pending.email),
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
          ...starterQuota,
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

      await ensureWorkspaceMembership(tx, {
        workspaceId: workspace.id,
        userId: createdUser.id,
        role: Role.OWNER,
      });

      await createSampleIncidentsForWorkspace(tx, {
        workspaceId: workspace.id,
        ownerUserId: createdUser.id,
      });

      return { user: createdUser, workspace };
    });

    const session = await issueAppSession(created.user.id);
    clearAuthEmailOtp("register", parsed.data.methodId, pending.email).catch((cleanupError) =>
      log.auth.warn("Failed to clear registration OTP challenge", {
        methodId: parsed.data.methodId,
        error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
      }),
    );

    // Collect email subscription
    upsertEmailSubscription({
      email: created.user.email,
      name: created.user.name,
      userId: created.user.id,
    }).catch(() => {});

    // Mark invite code as used
    if (pending.inviteCode) {
      await prisma.inviteCode.update({
        where: { code: pending.inviteCode },
        data: { used: true, usedAt: new Date(), usedByUserId: created.user.id },
      });
    }

    scheduleWelcomeEmail({
      workspaceId: created.workspace.id,
      toEmail: created.user.email,
      workspaceName: created.workspace.name,
      userName: created.user.name,
    });

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

    const plan = parsed.data.plan;
    const interval = parsed.data.interval;
    let redirectTo: string;
    if (plan === "starter" || plan === "pro") {
      const params = new URLSearchParams({ plan });
      if (interval) params.set("interval", interval);
      redirectTo = `/workspace/billing/checkout?${params.toString()}`;
    } else {
      redirectTo = created.workspace.slug
        ? workspacePath("/dashboard", created.workspace.slug, created.user.role)
        : "/dashboard";
    }

    const response = NextResponse.json({
      user: {
        id: created.user.id,
        email: created.user.email,
        name: created.user.name,
      },
      redirectTo,
    });

    setSessionCookie(response, session.sessionToken, session.expiresAt);

    recordAuditLog({
      workspaceId: created.workspace.id,
      action: "auth.register",
      targetType: "User",
      targetId: created.user.id,
      summary: `User ${created.user.email} registered${pending.inviteToken ? " via invite" : ""}${pending.inviteCode ? ` (invite code: ${pending.inviteCode})` : ""}`,
      actorUserId: created.user.id,
      ipAddress: requestIpAddress(request),
    }).catch(() => {});

    return response;
  } catch (error) {
    log.auth.error("Failed to verify registration OTP", {
      methodId: parsed.data.methodId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Invalid or expired verification code." }, { status: 401 });
  }
}
