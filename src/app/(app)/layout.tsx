import { AppShellFrame } from "@/components/app-shell-frame";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireAuth();
  const workspace = await prisma.workspace.findUnique({
    where: { id: auth.user.workspaceId },
    select: { complianceMode: true },
  });

  return (
    <AppShellFrame
      complianceMode={workspace?.complianceMode ?? false}
      userName={auth.user.name}
      workspaceName={auth.user.workspaceName}
    >
      {children}
    </AppShellFrame>
  );
}
