import { SamlSsoPanel } from "@/components/saml-sso-panel";
import { PlanBadge } from "@/components/upgrade-gate";
import { requireAuth } from "@/lib/auth";
import { resolveEffectivePlanTier } from "@/lib/billing-plan";
import { isFeatureAllowed } from "@/lib/feature-gate";
import { prisma } from "@/lib/prisma";

export default async function SettingsSsoPage() {
  const auth = await requireAuth();
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: auth.user.workspaceId },
    select: {
      id: true, samlEnabled: true, samlMetadataUrl: true,
      samlOrganizationId: true, samlConnectionId: true,
      planTier: true, trialEndsAt: true,
      billing: { select: { status: true } },
    },
  });
  const effectivePlanTier = resolveEffectivePlanTier({
    planTier: workspace.planTier,
    billingStatus: workspace.billing?.status,
    trialEndsAt: workspace.trialEndsAt,
  });
  const samlAllowed = isFeatureAllowed(effectivePlanTier, "saml");

  return (
    <div className="page-stack">
      <section className="dash-hero section-enter">
        <div className="dash-hero-inner">
          <div className="dash-hero-text">
            <p className="page-kicker">Security</p>
            <h1 className="page-title">SAML SSO <PlanBadge allowed={samlAllowed} planLabel="Enterprise" /></h1>
          </div>
        </div>
      </section>
      <section className="section-enter">
        <div className="dash-section-header">
          <h2 className="dash-chart-title">Enterprise single sign-on</h2>
          <p className="dash-chart-desc">Connect your identity provider to enforce SAML-based authentication for all workspace members.</p>
        </div>
        <div className="dash-chart-card">
          <SamlSsoPanel
            samlEnabled={workspace.samlEnabled}
            samlMetadataUrl={workspace.samlMetadataUrl}
            samlOrganizationId={workspace.samlOrganizationId}
            samlConnectionId={workspace.samlConnectionId}
            disabled={!samlAllowed}
          />
        </div>
      </section>
    </div>
  );
}
