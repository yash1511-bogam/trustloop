import { NextRequest, NextResponse } from "next/server";
import { AiProvider, Role, WorkflowType } from "@prisma/client";
import { z } from "zod";
import { recordAuditLog } from "@/lib/audit";
import { quotasForPlan } from "@/lib/billing-plan";
import { setSessionCookie } from "@/lib/cookies";
import { sendGettingStartedGuideEmail, sendWelcomeEmail } from "@/lib/email";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { redisDelete, redisGetJson } from "@/lib/redis";
import { createSampleIncidentsForWorkspace } from "@/lib/onboarding-demo";
import { createWorkspaceWithGeneratedSlug } from "@/lib/workspace-slug";
import { ensureWorkspaceMembership } from "@/lib/workspace-membership";
import { workspacePath } from "@/lib/workspace-url";

const schema = z.object({
  session: z.string().uuid(),
  companyName: z.string().min(2).max(80),
});

type PendingOAuthRegistration = {
  sessionToken: string;
  expiresAt: string;
  stytchUserId: string;
  email: string;
  name: string;
  inviteCode?: string;
  existingUserId?: string;
};

function startOfUtcDay(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Company name is required." }, { status: 400 });
  }

  const redisKey = `auth:oauth-pending:${parsed.data.session}`;
  const pending = await redisGetJson<PendingOAuthRegistration>(redisKey);
  if (!pending) {
    return NextResponse.json({ error: "Session expired. Start registration again." }, { status: 400 });
  }

  const existing = pending.existingUserId
    ? await prisma.user.findUnique({ where: { id: pending.existingUserId }, select: { id: true, stytchUserId: true } })
    : null;

  const created = await prisma.$transaction(async (tx) => {
    const workspace = await createWorkspaceWithGeneratedSlug(tx, parsed.data.companyName.trim(), {
      planTier: "starter",
    });
    const starterQuota = quotasForPlan("starter");

    const user = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: {
            workspaceId: workspace.id,
            role: Role.OWNER,
            stytchUserId: existing.stytchUserId !== pending.stytchUserId ? pending.stytchUserId : undefined,
          },
        })
      : await tx.user.create({
          data: {
            workspaceId: workspace.id,
            email: pending.email,
            name: pending.name || "Workspace Owner",
            role: Role.OWNER,
            stytchUserId: pending.stytchUserId,
          },
        });

    await tx.workflowSetting.createMany({
      data: [
        { workspaceId: workspace.id, workflowType: WorkflowType.INCIDENT_TRIAGE, provider: AiProvider.OPENAI, model: "gpt-4o-mini" },
        { workspaceId: workspace.id, workflowType: WorkflowType.CUSTOMER_UPDATE, provider: AiProvider.OPENAI, model: "gpt-4o-mini" },
      ],
    });

    await tx.workspaceQuota.create({ data: { workspaceId: workspace.id, ...starterQuota } });

    await tx.workspaceDailyUsage.upsert({
      where: { workspaceId_usageDate: { workspaceId: workspace.id, usageDate: startOfUtcDay() } },
      create: { workspaceId: workspace.id, usageDate: startOfUtcDay() },
      update: {},
    });

    await ensureWorkspaceMembership(tx, { workspaceId: workspace.id, userId: user.id, role: Role.OWNER });

    await createSampleIncidentsForWorkspace(tx, { workspaceId: workspace.id, ownerUserId: user.id });

    return { user, workspace };
  });

  await redisDelete(redisKey);

  // Mark invite code as used
  if (pending.inviteCode) {
    await prisma.inviteCode.update({
      where: { code: pending.inviteCode },
      data: { used: true, usedAt: new Date(), usedByUserId: created.user.id },
    });
  }

  recordAuditLog({ workspaceId: created.workspace.id, actorUserId: created.user.id, action: "auth.oauth_register", targetType: "user", targetId: created.user.id, summary: `OAuth registration for ${created.user.email}` }).catch(() => {});

  sendWelcomeEmail({ workspaceId: created.workspace.id, toEmail: created.user.email, workspaceName: created.workspace.name, userName: created.user.name }).catch((e) => {
    log.auth.error("Failed to send OAuth welcome email", { error: e instanceof Error ? e.message : String(e) });
  });
  sendGettingStartedGuideEmail({ workspaceId: created.workspace.id, toEmail: created.user.email, workspaceName: created.workspace.name, userName: created.user.name }).catch((e) => {
    log.auth.error("Failed to send OAuth getting started email", { error: e instanceof Error ? e.message : String(e) });
  });

  const redirectTo = created.workspace.slug
    ? workspacePath("/dashboard", created.workspace.slug, created.user.role)
    : "/dashboard";

  const response = NextResponse.json({ redirectTo });
  setSessionCookie(response, pending.sessionToken, new Date(pending.expiresAt));
  return response;
}
