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

  const stats = [
    { label: "AI keys", value: keyCount, sub: "Active provider connections" },
    { label: "Routes", value: workflowCount, sub: "Configured workflow mappings" },
    { label: "Members", value: memberCount, sub: "Current team members" },
    { label: "Invites", value: inviteCount, sub: "Pending workspace invites" },
    { label: "Integrations", value: activeIntegrations, sub: "Active webhook connections" },
    { label: "Plan", value: planDefinitionFor(effectivePlanTier).label, sub: workspace.billing?.status ?? "No billing status yet" },
  ];

  return (
    <div className="page-stack">
      <section className="dash-hero section-enter">
        <div className="dash-hero-inner">
          <div className="dash-hero-text">
            <p className="page-kicker">Settings</p>
            <h1 className="page-title">Overview</h1>
          </div>
        </div>
      </section>

      <section className="section-enter">
        <div className="dash-section-header">
          <h2 className="dash-chart-title">Workspace snapshot</h2>
          <p className="dash-chart-desc">Current counts for keys, routing, access, and live integrations.</p>
        </div>
        <div className="dash-stats" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {stats.map((s) => (
            <div key={s.label} className="dash-stat-card">
              <div className="dash-stat-value" style={{ fontSize: 28 }}>{s.value}</div>
              <div className="dash-stat-label">{s.label}</div>
              <div className="dash-stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
