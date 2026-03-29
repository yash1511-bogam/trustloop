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
      <section className="dash-hero section-enter">
        <div className="dash-hero-inner">
          <div className="dash-hero-text">
            <p className="page-kicker">Account</p>
            <h1 className="page-title">Profile</h1>
          </div>
        </div>
      </section>

      <section className="section-enter">
        <div className="dash-section-header">
          <h2 className="dash-chart-title">Responder profile</h2>
          <p className="dash-chart-desc">Keep your name and phone number current for urgent incident communications.</p>
        </div>
        <div className="dash-chart-card">
          <ProfileSettingsPanel planTier={planTier} profile={profile} />
        </div>
      </section>
    </div>
  );
}
