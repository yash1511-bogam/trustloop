import { IntegrationsPanel } from "@/components/integrations-panel";
import { PlanBadge, UpgradeGate } from "@/components/upgrade-gate";
import { requireAuth } from "@/lib/auth";
import { resolveEffectivePlanTier } from "@/lib/billing-plan";
import { isFeatureAllowed } from "@/lib/feature-gate";
import { prisma } from "@/lib/prisma";
import { listWebhookIntegrations } from "@/lib/webhook-integration";

export default async function SettingsWebhooksPage() {
  const auth = await requireAuth();
  const [workspace, integrations] = await Promise.all([
    prisma.workspace.findUniqueOrThrow({
      where: { id: auth.user.workspaceId },
      select: { planTier: true, trialEndsAt: true, billing: { select: { status: true } } },
    }),
    listWebhookIntegrations(auth.user.workspaceId),
  ]);
  const effectivePlanTier = resolveEffectivePlanTier({
    planTier: workspace.planTier,
    billingStatus: workspace.billing?.status,
    trialEndsAt: workspace.trialEndsAt,
  });
  const webhooksAllowed = isFeatureAllowed(effectivePlanTier, "webhooks");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const endpoints = {
    DATADOG: `${appUrl}/api/webhooks/datadog`,
    PAGERDUTY: `${appUrl}/api/webhooks/pagerduty`,
    SENTRY: `${appUrl}/api/webhooks/sentry`,
    GENERIC: `${appUrl}/api/webhooks/generic`,
    LANGFUSE: `${appUrl}/api/webhooks/langfuse`,
    HELICONE: `${appUrl}/api/webhooks/helicone`,
    ARIZE_PHOENIX: `${appUrl}/api/webhooks/arize-phoenix`,
    BRAINTRUST: `${appUrl}/api/webhooks/braintrust`,
  } as const;

  return (
    <div className="page-stack">
      <section className="dash-hero section-enter">
        <div className="dash-hero-inner">
          <div className="dash-hero-text">
            <p className="page-kicker">Integrations</p>
            <h1 className="page-title">Webhooks</h1>
          </div>
        </div>
      </section>
      <section className="section-enter">
        <div className="dash-section-header">
          <h2 className="dash-chart-title">
            Webhook integrations
            <PlanBadge allowed={webhooksAllowed} planLabel="Starter" />
          </h2>
          <p className="dash-chart-desc">Configure signed inbound secrets for Datadog, PagerDuty, Sentry, and AI observability sources.</p>
        </div>
        <UpgradeGate allowed={webhooksAllowed} planLabel="Starter">
          <div className="dash-chart-card">
            <IntegrationsPanel endpoints={endpoints} initialIntegrations={integrations} />
          </div>
        </UpgradeGate>
      </section>
    </div>
  );
}
