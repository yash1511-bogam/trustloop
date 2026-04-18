import { NextRequest, NextResponse } from "next/server";
import { BillingSubscriptionStatus, Role } from "@prisma/client";
import { requireInternalApiAuth, requireRole } from "@/lib/internal-auth";
import { applyWorkspacePlan } from "@/lib/billing-plan-server";
import { normalizePlanTier, type PlanTier } from "@/lib/billing-plan";
import { sendPlanUpgradedByAdminEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

const VALID_PLANS: PlanTier[] = ["starter", "pro", "enterprise"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireInternalApiAuth(request);
  if (!auth || !requireRole(auth, ["CEO"])) return NextResponse.json(null, { status: 404 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const plan = body?.plan as string;
  if (!plan || !VALID_PLANS.includes(plan as PlanTier)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id },
    select: { id: true, name: true, planTier: true },
  });
  if (!workspace) return NextResponse.json(null, { status: 404 });

  const previousPlan = normalizePlanTier(workspace.planTier);
  if (previousPlan === plan) {
    return NextResponse.json({ error: "Already on this plan" }, { status: 409 });
  }

  await applyWorkspacePlan({ prisma, workspaceId: id, planTier: plan as PlanTier });

  // Ensure billing record exists and is ACTIVE
  await prisma.workspaceBilling.upsert({
    where: { workspaceId: id },
    create: { workspaceId: id, status: BillingSubscriptionStatus.ACTIVE },
    update: { status: BillingSubscriptionStatus.ACTIVE },
  });

  // Notify workspace owners/managers
  const recipients = await prisma.user.findMany({
    where: { workspaceId: id, role: { in: [Role.OWNER, Role.MANAGER] } },
    select: { email: true },
  });
  for (const r of recipients) {
    await sendPlanUpgradedByAdminEmail({
      workspaceId: id, toEmail: r.email, workspaceName: workspace.name,
      previousPlan, newPlan: plan,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, plan });
}
