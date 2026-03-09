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
    <div className="space-y-16 pt-8">
      <section>
        <p className="kicker">Settings workspace</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-100">Configuration overview</h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-500">
          Settings are now split into focused pages to reduce page clutter and make operations faster.
        </p>
      </section>

      <section className="pb-10 border-b border-white/5">
        <h2 className="text-xl font-medium text-slate-100 mb-8">Workspace snapshot</h2>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">AI keys</p>
            <p className="text-2xl font-light text-slate-100">{keyCount}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">Routes</p>
            <p className="text-2xl font-light text-slate-100">{workflowCount}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">Members</p>
            <p className="text-2xl font-light text-slate-100">{memberCount}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">Invites</p>
            <p className="text-2xl font-light text-slate-100">{inviteCount}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">Webhooks</p>
            <p className="text-2xl font-light text-slate-100">{activeIntegrations}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">Billing</p>
            <p className="text-sm font-medium text-slate-200 mt-2">{workspace.billing?.status ?? "NONE"}</p>
          </div>
        </div>
      </section>

      <section className="pb-10">
        <h2 className="text-xl font-medium text-slate-100">Navigation</h2>
        <p className="mt-2 text-sm text-neutral-500 max-w-2xl">
          Use the left menu bar to open AI & API Keys, Workspace, Team, and Billing pages. 
          Your current active plan tier is <strong className="text-slate-200 font-medium">{workspace.planTier}</strong>.
        </p>
      </section>
    </div>
  );
}
