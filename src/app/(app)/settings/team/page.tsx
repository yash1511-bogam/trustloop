import { ProfileSettingsPanel } from "@/components/profile-settings-panel";
import { TeamManagementPanel } from "@/components/team-management-panel";
import { requireAuth } from "@/lib/auth";
import { getWorkspacePlanTier } from "@/lib/plan-tier-cache";
import { prisma } from "@/lib/prisma";

export default async function SettingsTeamPage() {
  const auth = await requireAuth();

  const [members, invites, profile, planTier] = await Promise.all([
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
    prisma.user.findUniqueOrThrow({
      where: { id: auth.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
      },
    }),
    getWorkspacePlanTier(auth.user.workspaceId),
  ]);

  return (
    <div className="page-stack">
      <section className="page-header section-enter">
        <div className="page-header-main">
          <p className="page-kicker">Workspace</p>
          <h1 className="page-title">Team</h1>
          <p className="page-description">
            Invite responders, manage roles, and keep the on-call contact layer current.
          </p>
        </div>
      </section>

      <section className="settings-section section-enter">
        <div className="settings-section-header">
          <h2 className="settings-section-title">Team management</h2>
          <p className="settings-section-description">
            Invite teammates, assign roles, and remove members without leaving the workspace context.
          </p>
        </div>

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
      </section>

      <section className="settings-section section-enter" id="profile">
        <div className="settings-section-header">
          <h2 className="settings-section-title">Profile & on-call</h2>
          <p className="settings-section-description">
            Keep personal contact details accurate so P1 escalations reach the right person immediately.
          </p>
        </div>

        <ProfileSettingsPanel profile={profile} planTier={planTier} />
      </section>
    </div>
  );
}
