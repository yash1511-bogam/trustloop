import { IntegrationsPanel } from "@/components/integrations-panel";
import { QuotaSettingsPanel } from "@/components/quota-settings-panel";
import { WorkspaceSettingsPanel } from "@/components/workspace-settings-panel";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slackInstallUrl } from "@/lib/slack";
import { listWebhookIntegrations } from "@/lib/webhook-integration";

export default async function SettingsWorkspacePage() {
  const auth = await requireAuth();

  const [quota, workspace, integrations] = await Promise.all([
    prisma.workspaceQuota.upsert({
      where: { workspaceId: auth.user.workspaceId },
      create: { workspaceId: auth.user.workspaceId },
      update: {},
    }),
    prisma.workspace.findUniqueOrThrow({
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
        billing: {
          select: {
            dodoCustomerId: true,
            dodoSubscriptionId: true,
            status: true,
          },
        },
      },
    }),
    listWebhookIntegrations(auth.user.workspaceId),
  ]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const endpoints = {
    DATADOG: `${appUrl}/api/webhooks/datadog`,
    PAGERDUTY: `${appUrl}/api/webhooks/pagerduty`,
    SENTRY: `${appUrl}/api/webhooks/sentry`,
    GENERIC: `${appUrl}/api/webhooks/generic`,
    LANGFUSE: `${appUrl}/api/webhooks/langfuse`,
    HELICONE: `${appUrl}/api/webhooks/helicone`,
  } as const;

  return (
    <>
      <section className="surface p-6">
        <p className="kicker">Workspace controls</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-100">Quotas, integrations, and workspace policy</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Manage workspace-level rate limits, status page behavior, Slack + SSO configuration, and signed webhook inputs.
        </p>
      </section>

      <section className="surface p-6">
        <h2 className="text-2xl font-semibold text-slate-100">Workspace quotas</h2>
        <p className="mt-1 text-sm text-slate-500">Tenant-aware rate-limit and daily quota controls for this workspace.</p>
        <div className="mt-4">
          <QuotaSettingsPanel
            initialQuota={{
              apiRequestsPerMinute: quota.apiRequestsPerMinute,
              incidentsPerDay: quota.incidentsPerDay,
              triageRunsPerDay: quota.triageRunsPerDay,
              customerUpdatesPerDay: quota.customerUpdatesPerDay,
              reminderEmailsPerDay: quota.reminderEmailsPerDay,
              reminderIntervalHoursP1: quota.reminderIntervalHoursP1,
              reminderIntervalHoursP2: quota.reminderIntervalHoursP2,
            }}
          />
        </div>
      </section>

      <section className="surface p-6">
        <h2 className="text-2xl font-semibold text-slate-100">Workspace settings</h2>
        <p className="mt-1 text-sm text-slate-500">Control public status page, Slack connect/channel, and enterprise SSO metadata.</p>
        <div className="mt-4">
          <WorkspaceSettingsPanel
            workspace={workspace}
            slackInstallUrl={slackInstallUrl(auth.user.workspaceId)}
          />
        </div>
      </section>

      <section className="surface p-6">
        <h2 className="text-2xl font-semibold text-slate-100">Webhook integrations</h2>
        <p className="mt-1 text-sm text-slate-500">
          Configure signed inbound webhook secrets for Datadog, PagerDuty, Sentry, and AI observability tools.
        </p>
        <div className="mt-4">
          <IntegrationsPanel
            endpoints={endpoints}
            initialIntegrations={integrations}
          />
        </div>
      </section>
    </>
  );
}
