import { requireAuth } from "@/lib/auth";
import { planDefinitionFor, resolveEffectivePlanTier } from "@/lib/billing-plan";
import { prisma } from "@/lib/prisma";
import { listWebhookIntegrations } from "@/lib/webhook-integration";

export default async function SettingsOverviewPage() {
  const auth = await requireAuth();

  const [
    keyCount,
    workflowCount,
    memberCount,
    inviteCount,
    workspace,
    integrations,
  ] = await Promise.all([
    prisma.aiProviderKey.count({
      where: { workspaceId: auth.user.workspaceId },
    }),
    prisma.workflowSetting.count({
      where: { workspaceId: auth.user.workspaceId },
    }),
    prisma.user.count({
      where: { workspaceId: auth.user.workspaceId },
    }),
    prisma.workspaceInvite.count({
      where: {
        workspaceId: auth.user.workspaceId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    }),
    prisma.workspace.findUniqueOrThrow({
      where: { id: auth.user.workspaceId },
      select: {
        planTier: true,
        trialEndsAt: true,
        billing: {
          select: {
            status: true,
          },
        },
      },
    }),
    listWebhookIntegrations(auth.user.workspaceId),
  ]);

  const activeIntegrations = integrations.filter((item) => item.isActive).length;
  const effectivePlanTier = resolveEffectivePlanTier({
    planTier: workspace.planTier,
    billingStatus: workspace.billing?.status,
    trialEndsAt: workspace.trialEndsAt,
  });

  return (
    <div className="page-stack">
      <section className="page-header section-enter">
        <div className="page-header-main">
          <p className="page-kicker">Workspace</p>
          <h1 className="page-title">Configuration overview</h1>
          <p className="page-description">
            The operating state of your workspace at a glance, before you move into deeper settings.
          </p>
        </div>
      </section>

      <section className="settings-section section-enter">
        <div className="settings-section-header">
          <h2 className="settings-section-title">Workspace snapshot</h2>
          <p className="settings-section-description">
            Current counts for keys, routing, access, and live integrations.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <article className="metric-card">
            <p className="metric-label">AI keys</p>
            <p className="metric-value">{keyCount}</p>
            <p className="metric-meta">Active provider connections</p>
          </article>
          <article className="metric-card">
            <p className="metric-label">Routes</p>
            <p className="metric-value">{workflowCount}</p>
            <p className="metric-meta">Configured workflow mappings</p>
          </article>
          <article className="metric-card">
            <p className="metric-label">Members</p>
            <p className="metric-value">{memberCount}</p>
            <p className="metric-meta">Current team members</p>
          </article>
          <article className="metric-card">
            <p className="metric-label">Invites</p>
            <p className="metric-value">{inviteCount}</p>
            <p className="metric-meta">Pending workspace invites</p>
          </article>
          <article className="metric-card">
            <p className="metric-label">Integrations</p>
            <p className="metric-value">{activeIntegrations}</p>
            <p className="metric-meta">Active webhook connections</p>
          </article>
          <article className="metric-card">
            <p className="metric-label">Plan</p>
            <p className="metric-value">{planDefinitionFor(effectivePlanTier).label}</p>
            <p className="metric-meta">{workspace.billing?.status ?? "No billing status yet"}</p>
          </article>
        </div>
      </section>
    </div>
  );
}
