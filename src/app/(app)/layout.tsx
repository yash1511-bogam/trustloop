import { redirect } from "next/navigation";
import { BillingSubscriptionStatus } from "@prisma/client";
import { AppShellFrame } from "@/components/app-shell-frame";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listUserWorkspaceMemberships } from "@/lib/workspace-membership";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireAuth();
  const [workspace, memberships] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: auth.user.workspaceId },
      select: {
        complianceMode: true,
        trialEndsAt: true,
        billing: { select: { status: true } },
      },
    }),
    listUserWorkspaceMemberships(auth.user.id),
  ]);

  const billingStatus = workspace?.billing?.status ?? BillingSubscriptionStatus.NONE;
  const needsPlan =
    !workspace?.trialEndsAt &&
    billingStatus !== BillingSubscriptionStatus.ACTIVE &&
    billingStatus !== BillingSubscriptionStatus.TRIALING &&
    billingStatus !== BillingSubscriptionStatus.PENDING;

  if (needsPlan) {
    redirect("/choose-plan");
  }

  return (
    <AppShellFrame
      complianceMode={workspace?.complianceMode ?? false}
      userName={auth.user.name}
      currentWorkspaceId={auth.user.workspaceId}
      workspaceName={auth.user.workspaceName}
      workspaces={memberships.map((membership) => ({
        id: membership.workspace.id,
        name: membership.workspace.name,
        role: membership.role,
        slug: membership.workspace.slug,
      }))}
    >
      {children}
    </AppShellFrame>
  );
}
