import { PushNotificationPanel } from "@/components/push-notification-panel";
import { QuotaSettingsPanel } from "@/components/quota-settings-panel";
import { requireAuth } from "@/lib/auth";
import {
  clampQuotaToPlan,
  quotasForPlan,
  resolveEffectivePlanTier,
} from "@/lib/billing-plan";
import { isFeatureAllowed } from "@/lib/feature-gate";
import { prisma } from "@/lib/prisma";

export default async function SettingsWorkspacePage() {
  const auth = await requireAuth();
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: auth.user.workspaceId },
    select: { planTier: true, trialEndsAt: true, billing: { select: { status: true } } },
  });
  const effectivePlanTier = resolveEffectivePlanTier({
    planTier: workspace.planTier,
    billingStatus: workspace.billing?.status,
    trialEndsAt: workspace.trialEndsAt,
  });
  const quota = await prisma.workspaceQuota.upsert({
    where: { workspaceId: auth.user.workspaceId },
    create: { workspaceId: auth.user.workspaceId, ...quotasForPlan(effectivePlanTier) },
    update: {},
  });
  const clampedQuota = clampQuotaToPlan(quota, effectivePlanTier);
  const planLimits = quotasForPlan(effectivePlanTier);

  return (
    <div className="page-stack">
      <section className="dash-hero section-enter">
        <div className="dash-hero-inner">
          <div className="dash-hero-text">
            <p className="page-kicker">Workspace</p>
            <h1 className="page-title">Quotas & notifications</h1>
          </div>
        </div>
      </section>

      <section className="section-enter">
        <div className="dash-section-header">
          <h2 className="dash-chart-title">Workspace quotas</h2>
          <p className="dash-chart-desc">Tenant-aware rate limits and daily usage controls for API calls, triage runs, reminders, and outbound updates.</p>
        </div>
        <div className="dash-chart-card">
          <QuotaSettingsPanel
            initialQuota={{
              apiRequestsPerMinute: clampedQuota.apiRequestsPerMinute,
              incidentsPerDay: clampedQuota.incidentsPerDay,
              triageRunsPerDay: clampedQuota.triageRunsPerDay,
              customerUpdatesPerDay: clampedQuota.customerUpdatesPerDay,
              reminderEmailsPerDay: clampedQuota.reminderEmailsPerDay,
              reminderIntervalHoursP1: quota.reminderIntervalHoursP1,
              reminderIntervalHoursP2: quota.reminderIntervalHoursP2,
              onCallRotationEnabled:
                isFeatureAllowed(effectivePlanTier, "on_call") && quota.onCallRotationEnabled,
              onCallRotationIntervalHours: quota.onCallRotationIntervalHours,
              onCallRotationAnchorAt: quota.onCallRotationAnchorAt.toISOString(),
            }}
            planTier={effectivePlanTier}
            planLimits={planLimits}
          />
        </div>
      </section>

      <section className="section-enter">
        <div className="dash-section-header">
          <h2 className="dash-chart-title">Browser push notifications</h2>
          <p className="dash-chart-desc">Enable device-level reminders and escalation alerts for your account.</p>
        </div>
        <div className="dash-chart-card">
          <PushNotificationPanel />
        </div>
      </section>
    </div>
  );
}
