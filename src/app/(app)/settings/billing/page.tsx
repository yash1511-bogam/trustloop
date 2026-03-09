import { BillingPanel } from "@/components/billing-panel";
import { Role } from "@prisma/client";
import { hasRole, requireAuth } from "@/lib/auth";
import { normalizePlanTier } from "@/lib/billing-plan";
import { dodoCheckoutMode } from "@/lib/dodo";
import { prisma } from "@/lib/prisma";

type SearchParams = Promise<{
  billing?: string;
}>;

function billingNoticeFromQuery(value?: string): string | null {
  if (value === "return" || value === "success") {
    return "Checkout returned to TrustLoop. Billing status may take a moment to refresh after payment confirmation.";
  }
  if (value === "cancelled") {
    return "Checkout was cancelled before payment completed.";
  }
  return null;
}

export default async function SettingsBillingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const auth = await requireAuth();
  const params = await searchParams;
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
            status: true,
            discountCode: true,
            lastPaymentAt: true,
            lastPaymentAmount: true,
            lastPaymentCurrency: true,
            lastInvoiceUrl: true,
            paymentFailedAt: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            canceledAt: true,
            cancelReason: true,
            failureReminderCount: true,
          },
        },
      },
    }),
  ]);

  return (
    <div className="space-y-12">
      <section>
        <p className="kicker">Billing and plans</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-100">Manage plan changes and payment</h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-500">
          Review workspace usage, compare available plans, and move into payment only when you are ready.
        </p>
      </section>

      <BillingPanel
        billingNotice={billingNoticeFromQuery(params.billing)}
        canManageBilling={hasRole({ user: auth.user }, [Role.OWNER, Role.MANAGER])}
        checkoutMode={dodoCheckoutMode()}
        planTier={normalizePlanTier(workspace.planTier)}
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
                discountCode: workspace.billing.discountCode,
                currentPeriodStart: workspace.billing.currentPeriodStart?.toISOString() ?? null,
                currentPeriodEnd: workspace.billing.currentPeriodEnd?.toISOString() ?? null,
                canceledAt: workspace.billing.canceledAt?.toISOString() ?? null,
                cancelReason: workspace.billing.cancelReason,
                failureReminderCount: workspace.billing.failureReminderCount,
                lastPaymentAt: workspace.billing.lastPaymentAt?.toISOString() ?? null,
                lastPaymentAmount: workspace.billing.lastPaymentAmount,
                lastPaymentCurrency: workspace.billing.lastPaymentCurrency,
                lastInvoiceUrl: workspace.billing.lastInvoiceUrl,
                paymentFailedAt: workspace.billing.paymentFailedAt?.toISOString() ?? null,
              }
            : null
        }
      />
    </div>
  );
}
