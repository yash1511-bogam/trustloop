import { BillingPanel } from "@/components/billing-panel";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SettingsBillingPage() {
  const auth = await requireAuth();
  const today = new Date(
    Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate(),
    ),
  );

  const [quota, usage, workspace] = await Promise.all([
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
        planTier: true,
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
  ]);

  return (
    <>
      <section className="surface p-6">
        <p className="kicker">Billing operations</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-100">Plan, usage, and payment lifecycle</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Manage Dodo Payments subscription state, coupon usage, and daily usage utilization against workspace quotas.
        </p>
      </section>

      <section className="surface p-6">
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
      </section>
    </>
  );
}
