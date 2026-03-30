import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { hasRole } from "@/lib/auth";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { recordAuditForAccess } from "@/lib/audit";
import { quotasForPlan } from "@/lib/billing-plan";
import { forbidden, badRequest } from "@/lib/http";
import { dodoClient, dodoProductIdForPlan } from "@/lib/dodo";
import { fireAndForget } from "@/lib/fire-and-forget";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  plan: z.enum(["starter", "pro"]),
  interval: z.enum(["monthly", "annual"]),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) return access.response;
  const auth = access.auth;
  if (auth.kind !== "session") return forbidden();
  if (!hasRole({ user: auth.user }, [Role.OWNER, Role.MANAGER])) return forbidden();

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid payload.");

  const billing = await prisma.workspaceBilling.findUnique({
    where: { workspaceId: auth.workspaceId },
    select: { dodoSubscriptionId: true, status: true, dodoProductId: true },
  });

  if (!billing?.dodoSubscriptionId || billing.status !== "ACTIVE") {
    return NextResponse.json({ error: "No active subscription to change." }, { status: 409 });
  }

  const newProductId = dodoProductIdForPlan(parsed.data.plan, parsed.data.interval);
  if (newProductId === billing.dodoProductId) {
    return NextResponse.json({ error: "Already on this plan and interval." }, { status: 409 });
  }

  try {
    await dodoClient().subscriptions.changePlan(billing.dodoSubscriptionId, {
      product_id: newProductId,
      proration_billing_mode: "do_not_bill",
      quantity: 1,
    });
  } catch (e) {
    log.billing.error("Dodo change plan failed", {
      workspaceId: auth.workspaceId,
      error: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({ error: "Failed to change plan with payment provider." }, { status: 500 });
  }

  await prisma.$transaction([
    prisma.workspaceBilling.update({
      where: { workspaceId: auth.workspaceId },
      data: { dodoProductId: newProductId },
    }),
    prisma.workspace.update({
      where: { id: auth.workspaceId },
      data: { planTier: parsed.data.plan },
    }),
    prisma.workspaceQuota.upsert({
      where: { workspaceId: auth.workspaceId },
      create: { workspaceId: auth.workspaceId, ...quotasForPlan(parsed.data.plan) },
      update: quotasForPlan(parsed.data.plan),
    }),
  ]);

  fireAndForget(
    recordAuditForAccess({
      access: auth,
      request,
      action: "billing.plan_changed",
      targetType: "WorkspaceBilling",
      targetId: auth.workspaceId,
      summary: `Plan changed to ${parsed.data.plan} ${parsed.data.interval}`,
    }),
    "billing.plan_changed audit",
  );

  return NextResponse.json({ ok: true });
}
