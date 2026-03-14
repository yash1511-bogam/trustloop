import { NextRequest, NextResponse } from "next/server";
import { BillingSubscriptionStatus, Role } from "@prisma/client";
import { z } from "zod";
import { hasRole } from "@/lib/auth";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { recordAuditForAccess } from "@/lib/audit";
import { applyWorkspacePlan } from "@/lib/billing-plan-server";
import { sendTrialStartedEmail } from "@/lib/email";
import { badRequest, forbidden } from "@/lib/http";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  plan: z.enum(["starter", "pro", "enterprise"]),
});

const TRIAL_DAYS = 14;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) return access.response;

  const auth = access.auth;
  if (auth.kind !== "session") return forbidden();
  if (!hasRole({ user: auth.user }, [Role.OWNER])) return forbidden();

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid plan selection.");

  const workspace = await prisma.workspace.findUnique({
    where: { id: auth.workspaceId },
    select: {
      id: true,
      name: true,
      trialEndsAt: true,
      billing: {
        select: {
          status: true,
          cancelReason: true,
        },
      },
    },
  });

  if (!workspace) return forbidden();

  // Block if already trialed or has active billing
  if (workspace.trialEndsAt || workspace.billing?.cancelReason === "trial_expired") {
    return NextResponse.json({ error: "Trial already used for this workspace." }, { status: 409 });
  }
  if (
    workspace.billing?.status === BillingSubscriptionStatus.ACTIVE ||
    workspace.billing?.status === BillingSubscriptionStatus.TRIALING
  ) {
    return NextResponse.json({ error: "Workspace already has an active subscription." }, { status: 409 });
  }

  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const plan = parsed.data.plan;

  await prisma.$transaction(async (tx) => {
    await tx.workspace.update({
      where: { id: workspace.id },
      data: { trialEndsAt },
    });

    await tx.workspaceBilling.upsert({
      where: { workspaceId: workspace.id },
      create: { workspaceId: workspace.id, status: BillingSubscriptionStatus.TRIALING },
      update: { status: BillingSubscriptionStatus.TRIALING },
    });
  });

  await applyWorkspacePlan({ prisma, workspaceId: workspace.id, planTier: plan });

  recordAuditForAccess({
    access: auth,
    request,
    action: "billing.trial_started",
    targetType: "WorkspaceBilling",
    targetId: workspace.id,
    summary: `Trial started for ${plan} plan`,
  }).catch(() => {});

  try {
    await sendTrialStartedEmail({
      workspaceId: workspace.id,
      toEmail: auth.user.email,
      workspaceName: workspace.name,
      userName: auth.user.name,
      planTier: plan,
      trialEndsAt,
    });
  } catch (error) {
    log.billing.error("Failed to send trial started email", {
      workspaceId: workspace.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return NextResponse.json({
    ok: true,
    plan,
    trialEndsAt: trialEndsAt.toISOString(),
  });
}
