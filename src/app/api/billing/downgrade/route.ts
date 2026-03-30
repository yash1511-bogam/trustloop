import { NextRequest, NextResponse } from "next/server";
import { BillingSubscriptionStatus, Role } from "@prisma/client";
import { z } from "zod";
import { hasRole } from "@/lib/auth";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { recordAuditForAccess } from "@/lib/audit";
import { normalizePlanTier, quotasForPlan } from "@/lib/billing-plan";
import { sendPlanDowngradedEmail } from "@/lib/email";
import { badRequest, forbidden } from "@/lib/http";
import { dodoClient, dodoProductIdForPlan } from "@/lib/dodo";
import { fireAndForget } from "@/lib/fire-and-forget";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const PLAN_RANK: Record<string, number> = { starter: 0, pro: 1, enterprise: 2 };

const schema = z.object({
  plan: z.enum(["starter"]),
  interval: z.enum(["monthly", "annual"]).optional().default("monthly"),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) return access.response;

  const auth = access.auth;
  if (auth.kind !== "session") return forbidden();
  if (!hasRole({ user: auth.user }, [Role.OWNER, Role.MANAGER])) return forbidden();

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid downgrade payload.");

  const targetPlan = parsed.data.plan;
  const interval = parsed.data.interval;

  const workspace = await prisma.workspace.findUnique({
    where: { id: auth.workspaceId },
    select: {
      id: true,
      name: true,
      planTier: true,
      billing: {
        select: {
          dodoSubscriptionId: true,
          status: true,
        },
      },
    },
  });

  if (!workspace) return forbidden();

  const currentPlan = normalizePlanTier(workspace.planTier);
  if ((PLAN_RANK[targetPlan] ?? 0) >= (PLAN_RANK[currentPlan] ?? 0)) {
    return badRequest("Target plan is not a downgrade from the current plan.");
  }

  // Update subscription product in Dodo if active
  if (workspace.billing?.dodoSubscriptionId && workspace.billing.status === BillingSubscriptionStatus.ACTIVE) {
    try {
      await dodoClient().subscriptions.changePlan(workspace.billing.dodoSubscriptionId, {
        product_id: dodoProductIdForPlan(targetPlan, interval),
        proration_billing_mode: "do_not_bill",
        quantity: 1,
      });
    } catch (e) {
      log.billing.error("Dodo subscription downgrade failed", {
        workspaceId: workspace.id,
        error: e instanceof Error ? e.message : String(e),
      });
      return NextResponse.json({ error: "Failed to downgrade subscription with payment provider." }, { status: 500 });
    }
  }

  // Update workspace plan and quotas
  const newQuotas = quotasForPlan(targetPlan);
  await prisma.$transaction([
    prisma.workspace.update({
      where: { id: workspace.id },
      data: { planTier: targetPlan },
    }),
    prisma.workspaceQuota.upsert({
      where: { workspaceId: workspace.id },
      create: { workspaceId: workspace.id, ...newQuotas },
      update: newQuotas,
    }),
    ...(workspace.billing
      ? [
          prisma.workspaceBilling.update({
            where: { workspaceId: workspace.id },
            data: { dodoProductId: dodoProductIdForPlan(targetPlan, interval) },
          }),
        ]
      : []),
  ]);

  fireAndForget(
    recordAuditForAccess({
      access: auth,
      request,
      action: "billing.plan_downgraded",
      targetType: "WorkspaceBilling",
      targetId: workspace.id,
      summary: `Plan downgraded from ${currentPlan} to ${targetPlan}`,
    }),
    "billing.downgrade audit",
  );

  try {
    await sendPlanDowngradedEmail({
      workspaceId: workspace.id,
      toEmail: auth.user.email,
      workspaceName: workspace.name,
      previousPlanTier: currentPlan,
      newPlanTier: targetPlan,
    });
  } catch (e) {
    log.billing.error("Downgrade email failed", {
      workspaceId: workspace.id,
      error: e instanceof Error ? e.message : String(e),
    });
  }

  return NextResponse.json({ ok: true, plan: targetPlan });
}
