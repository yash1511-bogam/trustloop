import Link from "next/link";
import { Bot, Building2, CreditCard, Users } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listWebhookIntegrations } from "@/lib/webhook-integration";

const cards = [
  {
    href: "/settings/ai",
    title: "AI & API Keys",
    description:
      "Configure OpenAI, Gemini, Anthropic, workflow routing, and workspace API tokens.",
    icon: Bot,
  },
  {
    href: "/settings/workspace",
    title: "Workspace",
    description:
      "Control quotas, Slack/status settings, SSO metadata, and inbound webhook integrations.",
    icon: Building2,
  },
  {
    href: "/settings/team",
    title: "Team",
    description: "Manage invites, roles, and personal on-call profile information.",
    icon: Users,
  },
  {
    href: "/settings/billing",
    title: "Billing",
    description: "Manage Dodo subscription status, coupons, and usage against daily quotas.",
    icon: CreditCard,
  },
] as const;

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
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-slate-100">Open a settings area</h2>
          <p className="mt-1 text-sm text-neutral-500">Each section has its own page and save cycle.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {cards.map((card) => (
            <Link
              className="panel-card group p-6 transition-transform duration-200 hover:-translate-y-1"
              href={card.href}
              key={card.href}
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(8,145,178,0.2)] text-cyan-300">
                <card.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-slate-100">{card.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-neutral-500">{card.description}</p>
            </Link>
          ))}
        </div>

        <p className="mt-6 text-sm text-neutral-500">
          Current plan tier: <span className="font-semibold text-slate-200">{workspace.planTier}</span>
        </p>
      </section>
    </>
  );
}
