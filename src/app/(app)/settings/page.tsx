import { AiSettingsPanel } from "@/components/ai-settings-panel";
import { ApiKeySettingsPanel } from "@/components/api-key-settings-panel";
import { BillingPanel } from "@/components/billing-panel";
import { IntegrationsPanel } from "@/components/integrations-panel";
import { ProfileSettingsPanel } from "@/components/profile-settings-panel";
import { QuotaSettingsPanel } from "@/components/quota-settings-panel";
import { TeamManagementPanel } from "@/components/team-management-panel";
import { WorkspaceSettingsPanel } from "@/components/workspace-settings-panel";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slackInstallUrl } from "@/lib/slack";
import { listWebhookIntegrations } from "@/lib/webhook-integration";

export default async function SettingsPage() {
  const auth = await requireAuth();
  const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));

  const [
    keys,
    workflows,
    quota,
    usage,
    workspace,
    apiKeys,
    members,
    invites,
    profile,
    integrations,
  ] = await Promise.all([
    prisma.aiProviderKey.findMany({
      where: { workspaceId: auth.user.workspaceId },
      select: {
        provider: true,
        keyLast4: true,
        isActive: true,
        healthStatus: true,
        lastVerifiedAt: true,
        lastVerificationError: true,
        updatedAt: true,
      },
      orderBy: { provider: "asc" },
    }),
    prisma.workflowSetting.findMany({
      where: { workspaceId: auth.user.workspaceId },
      select: {
        workflowType: true,
        provider: true,
        model: true,
      },
      orderBy: { workflowType: "asc" },
    }),
    prisma.workspaceQuota.upsert({
      where: { workspaceId: auth.user.workspaceId },
      create: { workspaceId: auth.user.workspaceId },
      update: {},
    }),
    prisma.workspaceDailyUsage.upsert({
      where: {
        workspaceId_usageDate: {
          workspaceId: auth.user.workspaceId,
          usageDate: today,
        },
      },
      create: {
        workspaceId: auth.user.workspaceId,
        usageDate: today,
      },
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
            discountCode: true,
            lastPaymentAt: true,
            lastPaymentAmount: true,
            lastPaymentCurrency: true,
            paymentFailedAt: true,
          },
        },
      },
    }),
    prisma.workspaceApiKey.findMany({
      where: { workspaceId: auth.user.workspaceId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        isActive: true,
        createdAt: true,
        lastUsedAt: true,
      },
    }),
    prisma.user.findMany({
      where: { workspaceId: auth.user.workspaceId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    }),
    prisma.workspaceInvite.findMany({
      where: {
        workspaceId: auth.user.workspaceId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        email: true,
        role: true,
        token: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
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
    <div className="space-y-5">
      <section className="surface p-5">
        <h2 className="text-2xl font-semibold">AI provider settings</h2>
        <p className="mt-1 text-sm text-slate-600">
          Configure your own OpenAI, Gemini, and Anthropic API keys plus per-workflow model routing.
        </p>
      </section>

      <section className="surface p-5">
        <AiSettingsPanel
          keys={keys.map((key) => ({
            ...key,
            lastVerifiedAt: key.lastVerifiedAt?.toISOString() ?? null,
            updatedAt: key.updatedAt.toISOString(),
          }))}
          workflows={workflows}
        />
      </section>

      <section className="surface p-5">
        <h2 className="text-2xl font-semibold">Workspace API keys</h2>
        <p className="mt-1 text-sm text-slate-600">
          Generate and revoke Bearer keys used by monitoring stacks and automation clients.
        </p>
        <div className="mt-4">
          <ApiKeySettingsPanel
            initialKeys={apiKeys.map((key) => ({
              ...key,
              createdAt: key.createdAt.toISOString(),
              lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
            }))}
          />
        </div>
      </section>

      <section className="surface p-5">
        <h2 className="text-2xl font-semibold">Workspace quotas</h2>
        <p className="mt-1 text-sm text-slate-600">
          Tenant-aware rate-limit and daily quota controls for this workspace.
        </p>
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

      <section className="surface p-5">
        <h2 className="text-2xl font-semibold">Workspace settings</h2>
        <p className="mt-1 text-sm text-slate-600">
          Control public status page, Slack connect/channel, and enterprise SSO metadata.
        </p>
        <div className="mt-4">
          <WorkspaceSettingsPanel
            workspace={workspace}
            slackInstallUrl={slackInstallUrl(auth.user.workspaceId)}
          />
        </div>
      </section>

      <section className="surface p-5">
        <h2 className="text-2xl font-semibold">Webhook integrations</h2>
        <p className="mt-1 text-sm text-slate-600">
          Configure signed inbound webhook secrets for Datadog, PagerDuty, Sentry, and AI observability tools.
        </p>
        <div className="mt-4">
          <IntegrationsPanel
            endpoints={endpoints}
            initialIntegrations={integrations}
          />
        </div>
      </section>

      <section className="surface p-5">
        <h2 className="text-2xl font-semibold">Team management</h2>
        <p className="mt-1 text-sm text-slate-600">
          Invite teammates, assign roles, and remove members.
        </p>
        <div className="mt-4">
          <TeamManagementPanel
            canManageRoles={auth.user.role === "OWNER"}
            currentUserId={auth.user.id}
            invites={invites.map((invite) => ({
              ...invite,
              createdAt: invite.createdAt.toISOString(),
              expiresAt: invite.expiresAt.toISOString(),
            }))}
            members={members.map((member) => ({
              ...member,
              createdAt: member.createdAt.toISOString(),
            }))}
          />
        </div>
      </section>

      <section className="surface p-5">
        <h2 className="text-2xl font-semibold">Profile & on-call</h2>
        <p className="mt-1 text-sm text-slate-600">
          Keep personal contact details up to date for urgent P1 notifications.
        </p>
        <div className="mt-4">
          <ProfileSettingsPanel profile={profile} />
        </div>
      </section>

      <section className="surface p-5">
        <h2 className="text-2xl font-semibold">Billing</h2>
        <p className="mt-1 text-sm text-slate-600">
          Manage plan tier and monitor daily quota utilization.
        </p>
        <div className="mt-4">
          <BillingPanel
            planTier={workspace.planTier}
            usage={{
              incidentsCreated: usage.incidentsCreated,
              triageRuns: usage.triageRuns,
              customerUpdates: usage.customerUpdates,
              reminderEmailsSent: usage.reminderEmailsSent,
            }}
            quota={{
              incidentsPerDay: quota.incidentsPerDay,
              triageRunsPerDay: quota.triageRunsPerDay,
              customerUpdatesPerDay: quota.customerUpdatesPerDay,
              reminderEmailsPerDay: quota.reminderEmailsPerDay,
            }}
            billing={
              workspace.billing
                ? {
                    status: workspace.billing.status,
                    dodoCustomerId: workspace.billing.dodoCustomerId,
                    dodoSubscriptionId: workspace.billing.dodoSubscriptionId,
                    discountCode: workspace.billing.discountCode,
                    lastPaymentAt: workspace.billing.lastPaymentAt?.toISOString() ?? null,
                    lastPaymentAmount: workspace.billing.lastPaymentAmount,
                    lastPaymentCurrency: workspace.billing.lastPaymentCurrency,
                    paymentFailedAt: workspace.billing.paymentFailedAt?.toISOString() ?? null,
                  }
                : null
            }
          />
        </div>
      </section>
    </div>
  );
}
