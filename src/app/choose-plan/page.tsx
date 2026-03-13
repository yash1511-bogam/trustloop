import { redirect } from "next/navigation";
import { BillingSubscriptionStatus } from "@prisma/client";
import { TrialPlanSelector } from "@/components/trial-plan-selector";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ChoosePlanPage() {
  const auth = await requireAuth();

  const workspace = await prisma.workspace.findUnique({
    where: { id: auth.user.workspaceId },
    select: { trialEndsAt: true, billing: { select: { status: true } } },
  });

  const status = workspace?.billing?.status;
  if (
    workspace?.trialEndsAt ||
    status === BillingSubscriptionStatus.ACTIVE ||
    status === BillingSubscriptionStatus.TRIALING
  ) {
    redirect("/dashboard");
  }

  return <TrialPlanSelector />;
}
