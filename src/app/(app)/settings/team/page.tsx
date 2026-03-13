import { ProfileSettingsPanel } from "@/components/profile-settings-panel";
import { TeamManagementPanel } from "@/components/team-management-panel";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SettingsTeamPage() {
  const auth = await requireAuth();

  const [members, invites, profile] = await Promise.all([
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
  ]);

  return (
    <div className="space-y-16 pt-8">
      <section>
        <p className="kicker">Team operations</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-100">Membership and on-call profile</h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-500">
          Invite teammates, assign roles safely, and keep contact data current for high-severity response workflows.
        </p>
      </section>

      <section className="pb-10 border-b border-white/5">
        <h2 className="text-xl font-medium text-slate-100">Team management</h2>
        <p className="mt-1 text-sm text-neutral-500">Invite teammates, assign roles, and remove members.</p>
        <div className="mt-8">
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

      <section className="pb-10">
        <h2 className="text-xl font-medium text-slate-100">Profile & on-call</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Keep personal contact details up to date for urgent P1 notifications.
        </p>
        <div className="mt-8">
          <ProfileSettingsPanel profile={profile} />
        </div>
      </section>
    </div>
  );
}
