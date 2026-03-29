import { WorkspaceSettingsPanel } from "@/components/workspace-settings-panel";
import { requireAuth } from "@/lib/auth";
import { resolveEffectivePlanTier } from "@/lib/billing-plan";
import { prisma } from "@/lib/prisma";
import { slackInstallUrl } from "@/lib/slack";

export default async function SettingsSsoPage() {
  const auth = await requireAuth();
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: auth.user.workspaceId },
    select: {
      id: true, name: true, slug: true, statusPageEnabled: true, planTier: true,
      slackChannelId: true, slackTeamId: true, samlEnabled: true, samlMetadataUrl: true,
      samlOrganizationId: true, samlConnectionId: true, complianceMode: true, trialEndsAt: true,
      billing: { select: { dodoCustomerId: true, dodoSubscriptionId: true, status: true } },
    },
  });
  const effectivePlanTier = resolveEffectivePlanTier({
    planTier: workspace.planTier,
    billingStatus: workspace.billing?.status,
    trialEndsAt: workspace.trialEndsAt,
  });

  return (
    <div className="page-stack">
      <section className="dash-hero section-enter">
        <div className="dash-hero-inner">
          <div className="dash-hero-text">
            <p className="page-kicker">Security</p>
            <h1 className="page-title">SAML SSO</h1>
          </div>
        </div>
      </section>
      <section className="section-enter">
        <div className="dash-section-header">
          <h2 className="dash-chart-title">Workspace settings</h2>
          <p className="dash-chart-desc">Configure the public status page, Slack incident routing, compliance mode, and enterprise SSO metadata.</p>
        </div>
        <div className="dash-chart-card">
          <WorkspaceSettingsPanel
            workspace={{ ...workspace, planTier: effectivePlanTier }}
            slackInstallUrl={slackInstallUrl(auth.user.workspaceId)}
          />
        </div>
      </section>
    </div>
  );
}
