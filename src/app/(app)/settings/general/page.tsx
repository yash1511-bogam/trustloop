import { GeneralSettingsPanel } from "@/components/general-settings-panel";
import { requireAuth } from "@/lib/auth";
import { resolveEffectivePlanTier } from "@/lib/billing-plan";
import { isFeatureAllowed } from "@/lib/feature-gate";
import { prisma } from "@/lib/prisma";
import { slackInstallUrl } from "@/lib/slack";

export default async function SettingsGeneralPage() {
  const auth = await requireAuth();
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: auth.user.workspaceId },
    select: {
      id: true, name: true, slug: true, statusPageEnabled: true, planTier: true,
      slackChannelId: true, slackTeamId: true, complianceMode: true, trialEndsAt: true,
      billing: { select: { status: true } },
    },
  });
  const tier = resolveEffectivePlanTier({
    planTier: workspace.planTier,
    billingStatus: workspace.billing?.status,
    trialEndsAt: workspace.trialEndsAt,
  });

  return (
    <div className="page-stack">
      <section className="dash-hero section-enter">
        <div className="dash-hero-inner">
          <div className="dash-hero-text">
            <p className="page-kicker">Workspace</p>
            <h1 className="page-title">General Settings</h1>
          </div>
        </div>
      </section>
      <section className="section-enter">
        <GeneralSettingsPanel
          workspace={{
            id: workspace.id,
            name: workspace.name,
            slug: workspace.slug,
            statusPageEnabled: workspace.statusPageEnabled,
            slackChannelId: workspace.slackChannelId,
            slackTeamId: workspace.slackTeamId,
            complianceMode: workspace.complianceMode,
          }}
          slackInstallUrl={slackInstallUrl(auth.user.workspaceId)}
          planTier={tier}
          complianceAllowed={isFeatureAllowed(tier, "compliance")}
        />
      </section>
    </div>
  );
}
