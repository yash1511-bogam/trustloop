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
    <div className="space-y-16 pt-8">
      <section>
        <p className="kicker">Workspace controls</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-100">Quotas, integrations, and workspace policy</h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-500">
          Manage workspace-level rate limits, status page behavior, Slack + SSO configuration, and signed webhook inputs.
        </p>
      </section>

      <section className="pb-10 border-b border-white/5">
        <h2 className="text-xl font-medium text-slate-100">Workspace quotas</h2>
        <p className="mt-1 text-sm text-neutral-500">Tenant-aware rate-limit and daily quota controls for this workspace.</p>
        <div className="mt-8">
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

      <section className="pb-10 border-b border-white/5">
        <h2 className="text-xl font-medium text-slate-100">
          On-call rotation
          <PlanBadge allowed={onCallAllowed} planLabel="Pro" />
        </h2>
        <p className="mt-1 text-sm text-neutral-500">View the current on-call schedule and rotation status for P1 escalations.</p>
        <div className="mt-8">
          <UpgradeGate allowed={onCallAllowed} planLabel="Pro">
            <OnCallPanel />
          </UpgradeGate>
        </div>
      </section>

      <section className="pb-10 border-b border-white/5">
        <h2 className="text-xl font-medium text-slate-100">Workspace settings</h2>
        <p className="mt-1 text-sm text-neutral-500">Control public status page, Slack connect/channel, and enterprise SSO metadata.</p>
        <div className="mt-8">
          <WorkspaceSettingsPanel
            workspace={{ ...workspace, planTier: effectivePlanTier }}
            slackInstallUrl={slackInstallUrl(auth.user.workspaceId)}
          />
        </div>
      </section>

      <section className="pb-10 border-b border-white/5">
        <h2 className="text-xl font-medium text-slate-100">
          Webhook integrations
          <PlanBadge allowed={webhooksAllowed} planLabel="Starter" />
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Configure signed inbound webhook secrets for Datadog, PagerDuty, Sentry, and AI observability tools.
        </p>
        <div className="mt-8">
          <UpgradeGate allowed={webhooksAllowed} planLabel="Starter">
            <IntegrationsPanel endpoints={endpoints} initialIntegrations={integrations} />
          </UpgradeGate>
        </div>
      </section>

      <section className="pb-10">
        <h2 className="text-xl font-medium text-slate-100">Browser push notifications</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Enable browser push for reminder and escalation alerts for your account.
        </p>
        <div className="mt-8">
          <PushNotificationPanel />
        </div>
      </section>
    </div>
  );
}
