import { OnCallPanel } from "@/components/on-call-panel";
import { PlanBadge } from "@/components/upgrade-gate";
import { requireAuth } from "@/lib/auth";
import { resolveEffectivePlanTier } from "@/lib/billing-plan";
import { isFeatureAllowed } from "@/lib/feature-gate";
import { prisma } from "@/lib/prisma";

export default async function SettingsOnCallPage() {
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
  const onCallAllowed = isFeatureAllowed(effectivePlanTier, "on_call");

  return (
    <div className="page-stack">
      <section className="dash-hero section-enter">
        <div className="dash-hero-inner">
          <div className="dash-hero-text">
            <p className="page-kicker">Integrations</p>
            <h1 className="page-title">On-Call Rotation <PlanBadge allowed={onCallAllowed} planLabel="Pro" /></h1>
          </div>
        </div>
      </section>
      <section className="section-enter">
        <div className="dash-section-header">
          <h2 className="dash-chart-title">On-call rotation</h2>
          <p className="dash-chart-desc">Review the current escalation schedule for P1 incidents and verify who will be paged next.</p>
        </div>
        <div className="dash-chart-card">
          <OnCallPanel disabled={!onCallAllowed} />
        </div>
      </section>
    </div>
  );
}
