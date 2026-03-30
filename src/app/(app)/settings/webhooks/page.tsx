import { IntegrationsPanel } from "@/components/integrations-panel";
import { PlanBadge, UpgradeGate } from "@/components/upgrade-gate";
import { appOrigin } from "@/lib/app-url";
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
  const baseUrl = appOrigin();
  const endpoints = {
    DATADOG: `${baseUrl}/api/webhooks/datadog`,
    PAGERDUTY: `${baseUrl}/api/webhooks/pagerduty`,
    SENTRY: `${baseUrl}/api/webhooks/sentry`,
    GENERIC: `${baseUrl}/api/webhooks/generic`,
    LANGFUSE: `${baseUrl}/api/webhooks/langfuse`,
    HELICONE: `${baseUrl}/api/webhooks/helicone`,
    ARIZE_PHOENIX: `${baseUrl}/api/webhooks/arize-phoenix`,
    BRAINTRUST: `${baseUrl}/api/webhooks/braintrust`,
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
