import { BillingPanel } from "@/components/billing-panel";
import { Role } from "@prisma/client";
import { hasRole, requireAuth } from "@/lib/auth";
import {
  clampQuotaToPlan,
  quotasForPlan,
  resolveEffectivePlanTier,
} from "@/lib/billing-plan";
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
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: auth.user.workspaceId },
    select: {
      planTier: true,
      trialEndsAt: true,
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
  });
  const effectivePlanTier = resolveEffectivePlanTier({
    planTier: workspace.planTier,
    billingStatus: workspace.billing?.status,
    trialEndsAt: workspace.trialEndsAt,
  });

  const [quota, usage] = await Promise.all([
    prisma.workspaceQuota.upsert({
      where: { workspaceId: auth.user.workspaceId },
      create: {
        workspaceId: auth.user.workspaceId,
        ...quotasForPlan(effectivePlanTier),
      },
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
  ]);
  const clampedQuota = clampQuotaToPlan(quota, effectivePlanTier);

  return (
    <div className="page-stack">
      <section className="dash-hero section-enter">
        <div className="dash-hero-inner">
          <div className="dash-hero-text">
            <p className="page-kicker">Workspace</p>
            <h1 className="page-title">Billing</h1>
            <p className="page-description">
              Review plan usage, compare tiers, and move into checkout only when you are ready.
            </p>
          </div>
        </div>
      </section>

      <section className="section-enter">
        <BillingPanel
          billingNotice={billingNoticeFromQuery(params.billing)}
          canManageBilling={hasRole({ user: auth.user }, [Role.OWNER, Role.MANAGER])}
          checkoutMode={dodoCheckoutMode()}
          planTier={effectivePlanTier}
          usage={{
            incidentsCreated: usage.incidentsCreated,
            triageRuns: usage.triageRuns,
            customerUpdates: usage.customerUpdates,
            reminderEmailsSent: usage.reminderEmailsSent,
          }}
          quota={{
            incidentsPerDay: clampedQuota.incidentsPerDay,
            triageRunsPerDay: clampedQuota.triageRunsPerDay,
            customerUpdatesPerDay: clampedQuota.customerUpdatesPerDay,
            reminderEmailsPerDay: clampedQuota.reminderEmailsPerDay,
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
      </section>
    </div>
  );
}
