import { IntegrationsPanel } from "@/components/integrations-panel";
import { OnCallPanel } from "@/components/on-call-panel";
import { PushNotificationPanel } from "@/components/push-notification-panel";
import { QuotaSettingsPanel } from "@/components/quota-settings-panel";
import { PlanBadge, UpgradeGate } from "@/components/upgrade-gate";
import { WorkspaceSettingsPanel } from "@/components/workspace-settings-panel";
import { requireAuth } from "@/lib/auth";
import {
  clampQuotaToPlan,
  quotasForPlan,
  resolveEffectivePlanTier,
} from "@/lib/billing-plan";
import { isFeatureAllowed } from "@/lib/feature-gate";
import { prisma } from "@/lib/prisma";
import { slackInstallUrl } from "@/lib/slack";
import { listWebhookIntegrations } from "@/lib/webhook-integration";

export default async function SettingsWorkspacePage() {
  const auth = await requireAuth();
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: auth.user.workspaceId },
    select: {
      id: true,
      name: true,
      slug: true,
      statusPageEnabled: true,
      planTier: true,
      slackChannelId: true,
      slackTeamId: true,
      samlEnabled: true,
      samlMetadataUrl: true,
      samlOrganizationId: true,
      samlConnectionId: true,
      complianceMode: true,
      trialEndsAt: true,
      billing: { select: { dodoCustomerId: true, dodoSubscriptionId: true, status: true } },
    },
  });
  const effectivePlanTier = resolveEffectivePlanTier({
    planTier: workspace.planTier,
    billingStatus: workspace.billing?.status,
    trialEndsAt: workspace.trialEndsAt,
  });
  const [quota, integrations] = await Promise.all([
    prisma.workspaceQuota.upsert({
      where: { workspaceId: auth.user.workspaceId },
      create: { workspaceId: auth.user.workspaceId, ...quotasForPlan(effectivePlanTier) },
      update: {},
    }),
    listWebhookIntegrations(auth.user.workspaceId),
  ]);
  const clampedQuota = clampQuotaToPlan(quota, effectivePlanTier);
  const planLimits = quotasForPlan(effectivePlanTier);

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

  const onCallAllowed = isFeatureAllowed(effectivePlanTier, "on_call");
  const webhooksAllowed = isFeatureAllowed(effectivePlanTier, "webhooks");

  return (
    <div className="page-stack">
      <section className="page-header section-enter">
        <div className="page-header-main">
          <p className="page-kicker">Workspace</p>
          <h1 className="page-title">Quotas, integrations, and workspace policy</h1>
          <p className="page-description">
            Control rate limits, signed inputs, status surfaces, and incident routing policy at the workspace level.
          </p>
        </div>
      </section>

      <section className="settings-section section-enter">
        <div className="settings-section-header">
          <h2 className="settings-section-title">Workspace quotas</h2>
          <p className="settings-section-description">
            Tenant-aware rate limits and daily usage controls for API calls, triage runs, reminders, and outbound updates.
          </p>
        </div>
        <div>
          <QuotaSettingsPanel
            initialQuota={{
              apiRequestsPerMinute: clampedQuota.apiRequestsPerMinute,
              incidentsPerDay: clampedQuota.incidentsPerDay,
              triageRunsPerDay: clampedQuota.triageRunsPerDay,
              customerUpdatesPerDay: clampedQuota.customerUpdatesPerDay,
              reminderEmailsPerDay: clampedQuota.reminderEmailsPerDay,
              reminderIntervalHoursP1: quota.reminderIntervalHoursP1,
              reminderIntervalHoursP2: quota.reminderIntervalHoursP2,
              onCallRotationEnabled:
                isFeatureAllowed(effectivePlanTier, "on_call") && quota.onCallRotationEnabled,
              onCallRotationIntervalHours: quota.onCallRotationIntervalHours,
              onCallRotationAnchorAt: quota.onCallRotationAnchorAt.toISOString(),
            }}
            planTier={effectivePlanTier}
            planLimits={planLimits}
          />
        </div>
      </section>

      <section className="settings-section section-enter">
        <div className="settings-section-header">
          <h2 className="settings-section-title">
            On-call rotation
            <PlanBadge allowed={onCallAllowed} planLabel="Pro" />
          </h2>
          <p className="settings-section-description">
            Review the current escalation schedule for P1 incidents and verify who will be paged next.
          </p>
        </div>
        <div>
          <UpgradeGate allowed={onCallAllowed} planLabel="Pro">
            <OnCallPanel />
          </UpgradeGate>
        </div>
      </section>

      <section className="settings-section section-enter">
        <div className="settings-section-header">
          <h2 className="settings-section-title">Workspace settings</h2>
          <p className="settings-section-description">
            Configure the public status page, Slack incident routing, compliance mode, and enterprise SSO metadata.
          </p>
        </div>
        <div>
          <WorkspaceSettingsPanel
            workspace={{ ...workspace, planTier: effectivePlanTier }}
            slackInstallUrl={slackInstallUrl(auth.user.workspaceId)}
          />
        </div>
      </section>

      <section className="settings-section section-enter">
        <div className="settings-section-header">
          <h2 className="settings-section-title">
            Webhook integrations
            <PlanBadge allowed={webhooksAllowed} planLabel="Starter" />
          </h2>
          <p className="settings-section-description">
            Configure signed inbound secrets for Datadog, PagerDuty, Sentry, and AI observability sources.
          </p>
        </div>
        <div>
          <UpgradeGate allowed={webhooksAllowed} planLabel="Starter">
            <IntegrationsPanel endpoints={endpoints} initialIntegrations={integrations} />
          </UpgradeGate>
        </div>
      </section>

      <section className="settings-section section-enter">
        <div className="settings-section-header">
          <h2 className="settings-section-title">Browser push notifications</h2>
          <p className="settings-section-description">
            Enable device-level reminders and escalation alerts for your account.
          </p>
        </div>
        <div>
          <PushNotificationPanel />
        </div>
      </section>
    </div>
  );
}
