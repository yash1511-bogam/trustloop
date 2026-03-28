import { AppShellFrame } from "@/components/app-shell-frame";
import { AnnounceProvider } from "@/components/announce-provider";
import { requireAuth } from "@/lib/auth";
import { getWorkspacePlanTier } from "@/lib/plan-tier-cache";
import { prisma } from "@/lib/prisma";
import { listUserWorkspaceMemberships } from "@/lib/workspace-membership";

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
      },
    }),
    listUserWorkspaceMemberships(auth.user.id),
    getWorkspacePlanTier(auth.user.workspaceId),
  ]);

  const currentMembership = memberships.find(
    (m) => m.workspace.id === auth.user.workspaceId,
  );

  return (
    <AppShellFrame
      complianceMode={workspace?.complianceMode ?? false}
      currentWorkspaceId={auth.user.workspaceId}
      currentRole={auth.user.role}
      currentSlug={currentMembership?.workspace.slug ?? null}
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
