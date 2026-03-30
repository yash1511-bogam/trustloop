import { NextRequest, NextResponse } from "next/server";
import { BillingSubscriptionStatus, Role } from "@prisma/client";
import { hasRole } from "@/lib/auth";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { recordAuditForAccess } from "@/lib/audit";
import { normalizePlanTier } from "@/lib/billing-plan";
import { sendPlanCanceledEmail } from "@/lib/email";
import { forbidden } from "@/lib/http";
import { dodoClient } from "@/lib/dodo";
import { fireAndForget } from "@/lib/fire-and-forget";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) return access.response;

  const auth = access.auth;
  if (auth.kind !== "session") return forbidden();
  if (!hasRole({ user: auth.user }, [Role.OWNER])) return forbidden();

  const billing = await prisma.workspaceBilling.findUnique({
    where: { workspaceId: auth.workspaceId },
    select: { dodoSubscriptionId: true, status: true, canceledAt: true },
  });

  if (!billing) {
    return NextResponse.json({ error: "No billing record found." }, { status: 404 });
  }

  if (billing.canceledAt) {
    return NextResponse.json({ error: "Subscription is already cancelled." }, { status: 409 });
  }

  if (billing.status !== BillingSubscriptionStatus.ACTIVE) {
    return NextResponse.json({ error: "Only active subscriptions can be cancelled." }, { status: 409 });
  }

  // Cancel at next billing date via Dodo
  if (billing.dodoSubscriptionId) {
    try {
      await dodoClient().subscriptions.update(billing.dodoSubscriptionId, {
        cancel_at_next_billing_date: true,
      });
    } catch (e) {
      log.billing.error("Dodo subscription cancel failed", {
        workspaceId: auth.workspaceId,
        error: e instanceof Error ? e.message : String(e),
      });
      return NextResponse.json({ error: "Failed to cancel subscription with payment provider." }, { status: 500 });
    }
  }

  const now = new Date();
  await prisma.workspaceBilling.update({
    where: { workspaceId: auth.workspaceId },
    data: { canceledAt: now, cancelReason: "user_requested" },
  });

  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: auth.workspaceId },
    select: { name: true, planTier: true },
  });

  fireAndForget(
    recordAuditForAccess({
      access: auth,
      request,
      action: "billing.subscription_canceled",
      targetType: "WorkspaceBilling",
      targetId: auth.workspaceId,
      summary: "Subscription cancelled at next billing cycle",
    }),
    "billing.cancel audit",
  );

  try {
    await sendPlanCanceledEmail({
      workspaceId: auth.workspaceId,
      toEmail: auth.user.email,
      workspaceName: workspace.name,
      previousPlanTier: normalizePlanTier(workspace.planTier),
      reason: "You cancelled your subscription. Access continues until the end of your current billing period.",
    });
  } catch (e) {
    log.billing.error("Cancel email failed", {
      workspaceId: auth.workspaceId,
      error: e instanceof Error ? e.message : String(e),
    });
  }

  return NextResponse.json({ ok: true, canceledAt: now.toISOString() });
}
