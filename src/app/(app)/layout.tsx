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
      },
    }),
    listUserWorkspaceMemberships(auth.user.id),
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
