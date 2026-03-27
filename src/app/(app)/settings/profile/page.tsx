import { ProfileSettingsPanel } from "@/components/profile-settings-panel";
import { requireAuth } from "@/lib/auth";
import { getWorkspacePlanTier } from "@/lib/plan-tier-cache";
import { prisma } from "@/lib/prisma";

export default async function SettingsProfilePage() {
  const auth = await requireAuth();
  const [profile, planTier] = await Promise.all([
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
          <p className="page-kicker">Account</p>
          <h1 className="page-title">Profile</h1>
          <p className="page-description">
            Personal contact details used across incident notifications and escalation routing.
          </p>
        </div>
      </section>

      <section className="settings-section section-enter">
        <div className="settings-section-header">
          <h2 className="settings-section-title">Responder profile</h2>
          <p className="settings-section-description">
            Keep your name and phone number current for urgent incident communications.
          </p>
        </div>

        <ProfileSettingsPanel planTier={planTier} profile={profile} />
      </section>
    </div>
  );
}
