import { AppShellFrame } from "@/components/app-shell-frame";
import { AnnounceProvider } from "@/components/announce-provider";
import { requireAuth } from "@/lib/auth";
import { isTrialActive } from "@/lib/billing-plan";
import { getWorkspacePlanTier } from "@/lib/plan-tier-cache";
import { prisma } from "@/lib/prisma";
import { listUserWorkspaceMemberships } from "@/lib/workspace-membership";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { workspaceBaseUrl } from "@/lib/workspace-url";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireAuth();
  const [workspace, memberships, planTier] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: auth.user.workspaceId },
      select: {
        complianceMode: true,
        trialEndsAt: true,
        slug: true,
      },
    }),
    listUserWorkspaceMemberships(auth.user.id),
    getWorkspacePlanTier(auth.user.workspaceId),
  ]);

  // ── Validate URL subdomain matches active workspace ──────────────────────
  const reqHeaders = await headers();
  const urlSlug = reqHeaders.get("x-workspace-slug");
  if (urlSlug && workspace?.slug && urlSlug !== workspace.slug) {
    // Check if user is a member of the workspace in the URL
    const urlMembership = memberships.find((m) => m.workspace.slug === urlSlug);
    if (!urlMembership) {
      // Not a member — redirect to their actual workspace
      redirect(workspaceBaseUrl(workspace.slug, auth.user.role) + "/dashboard");
    }
    // Is a member — redirect to the correct subdomain for their active workspace
    redirect(workspaceBaseUrl(workspace.slug, auth.user.role) + "/dashboard");
  }

  const currentMembership = memberships.find(
    (m) => m.workspace.id === auth.user.workspaceId,
  );

  let trialDaysLeft: number | null = null;
  if (workspace?.trialEndsAt && isTrialActive(workspace.trialEndsAt)) {
    const now = new Date();
    trialDaysLeft = Math.max(0, Math.ceil((new Date(workspace.trialEndsAt).getTime() - now.getTime()) / 86_400_000));
  }

  return (
    <AppShellFrame
      complianceMode={workspace?.complianceMode ?? false}
      currentWorkspaceId={auth.user.workspaceId}
      currentRole={auth.user.role}
      currentSlug={currentMembership?.workspace.slug ?? null}
      trialDaysLeft={trialDaysLeft}
      workspaceName={auth.user.workspaceName}
      workspacePlanTier={planTier}
      workspaces={memberships.map((membership) => ({
        id: membership.workspace.id,
        name: membership.workspace.name,
        role: membership.role,
        slug: membership.workspace.slug,
      }))}
    >
      <AnnounceProvider>{children}</AnnounceProvider>
    </AppShellFrame>
  );
}
