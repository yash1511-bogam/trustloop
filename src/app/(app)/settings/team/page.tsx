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
      <section className="dash-hero section-enter">
        <div className="dash-hero-inner">
          <div className="dash-hero-text">
            <p className="page-kicker">Workspace</p>
            <h1 className="page-title">Team</h1>
            <p className="page-description">
              Invite responders, manage roles, and keep the on-call contact layer current.
            </p>
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

      <section className="section-enter" id="profile">
        <div className="dash-section-header">
          <h2 className="dash-chart-title">Profile & on-call</h2>
          <p className="dash-chart-desc">Keep personal contact details accurate so P1 escalations reach the right person immediately.</p>
        </div>
        <div className="dash-chart-card">
          <ProfileSettingsPanel profile={profile} planTier={planTier} />
        </div>
      </section>
    </div>
  );
}
