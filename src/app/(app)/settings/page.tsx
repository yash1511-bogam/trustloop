import { requireAuth } from "@/lib/auth";
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

  return (
    <>
      <section className="surface p-6">
        <p className="kicker">Settings workspace</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-100">Configuration overview</h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-500">
          Settings are now split into focused pages to reduce page clutter and make operations faster.
        </p>
      </section>

      <section className="grid-cards">
        <article className="metric-card">
          <p className="kicker">AI keys</p>
          <p className="mt-2 text-3xl font-semibold">{keyCount}</p>
        </article>
        <article className="metric-card">
          <p className="kicker">Workflow routes</p>
          <p className="mt-2 text-3xl font-semibold">{workflowCount}</p>
        </article>
        <article className="metric-card">
          <p className="kicker">Team members</p>
          <p className="mt-2 text-3xl font-semibold">{memberCount}</p>
        </article>
        <article className="metric-card">
          <p className="kicker">Open invites</p>
          <p className="mt-2 text-3xl font-semibold">{inviteCount}</p>
        </article>
        <article className="metric-card">
          <p className="kicker">Active webhooks</p>
          <p className="mt-2 text-3xl font-semibold">{activeIntegrations}</p>
        </article>
        <article className="metric-card">
          <p className="kicker">Billing state</p>
          <p className="mt-2 text-3xl font-semibold">{workspace.billing?.status ?? "NONE"}</p>
        </article>
      </section>

      <section className="surface p-6">
        <h2 className="text-xl font-semibold text-slate-100">Navigation</h2>
        <p className="mt-2 text-sm text-neutral-500">
          Use the left menu bar to open AI & API Keys, Workspace, Team, and Billing pages.
        </p>
        <p className="mt-6 text-sm text-neutral-500">
          Current plan tier: <span className="font-semibold text-slate-200">{workspace.planTier}</span>
        </p>
      </section>
    </>
  );
}
