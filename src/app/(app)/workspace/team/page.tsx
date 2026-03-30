import { TeamManagementPanel } from "@/components/team-management-panel";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SettingsTeamPage() {
  const auth = await requireAuth();

  const [members, invites] = await Promise.all([
    prisma.workspaceMembership.findMany({
      where: { workspaceId: auth.user.workspaceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true,
          },
        },
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    }),
    prisma.workspaceInvite.findMany({
      where: {
        workspaceId: auth.user.workspaceId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        email: true,
        role: true,
        token: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="page-stack">
      <section className="dash-hero section-enter">
        <div className="dash-hero-inner">
          <div className="dash-hero-text">
            <p className="page-kicker">Workspace</p>
            <h1 className="page-title">Team</h1>
          </div>
        </div>
      </section>

      <section className="section-enter">
        <div className="dash-section-header">
          <h2 className="dash-chart-title">Team management</h2>
          <p className="dash-chart-desc">Invite teammates, assign roles, and remove members without leaving the workspace context.</p>
        </div>
        <div className="dash-chart-card">
          <TeamManagementPanel
            canManageRoles={auth.user.role === "OWNER"}
            currentUserId={auth.user.id}
            invites={invites.map((invite) => ({
              ...invite,
              createdAt: invite.createdAt.toISOString(),
              expiresAt: invite.expiresAt.toISOString(),
            }))}
            members={members.map((member) => ({
              id: member.user.id,
              name: member.user.name,
              email: member.user.email,
              phone: member.user.phone,
              role: member.role,
              createdAt: member.user.createdAt.toISOString(),
            }))}
          />
        </div>
      </section>
    </div>
  );
}
