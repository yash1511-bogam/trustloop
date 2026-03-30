import { ApiKeySettingsPanel } from "@/components/api-key-settings-panel";
import { PlanBadge } from "@/components/upgrade-gate";
import { requireAuth } from "@/lib/auth";
import { normalizeApiKeyScopes } from "@/lib/api-key-scopes";
import { resolveEffectivePlanTier } from "@/lib/billing-plan";
import { isFeatureAllowed } from "@/lib/feature-gate";
import { prisma } from "@/lib/prisma";
import { isTurnstileEnabled, turnstileSiteKey } from "@/lib/turnstile";

export default async function SettingsApiKeysPage() {
  const auth = await requireAuth();
  const siteKey = isTurnstileEnabled() ? turnstileSiteKey() : null;
  const [apiKeys, workspace] = await Promise.all([
    prisma.workspaceApiKey.findMany({
      where: { workspaceId: auth.user.workspaceId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, keyPrefix: true, scopes: true,
        isActive: true, createdAt: true, lastUsedAt: true, expiresAt: true,
      },
    }),
    prisma.workspace.findUniqueOrThrow({
      where: { id: auth.user.workspaceId },
      select: { planTier: true, trialEndsAt: true, billing: { select: { status: true } } },
    }),
  ]);
  const effectivePlanTier = resolveEffectivePlanTier({
    planTier: workspace.planTier,
    billingStatus: workspace.billing?.status,
    trialEndsAt: workspace.trialEndsAt,
  });
  const apiKeysAllowed = isFeatureAllowed(effectivePlanTier, "api_keys");

  return (
    <div className="page-stack">
      <section className="dash-hero section-enter">
        <div className="dash-hero-inner">
          <div className="dash-hero-text">
            <p className="page-kicker">Security</p>
            <h1 className="page-title">API Keys <PlanBadge allowed={apiKeysAllowed} planLabel="Pro" /></h1>
          </div>
        </div>
      </section>
      <section className="section-enter">
        <div className="dash-section-header">
          <h2 className="dash-chart-title">Workspace API keys</h2>
          <p className="dash-chart-desc">Issue scoped bearer keys for automation and revoke them cleanly when no longer needed.</p>
        </div>
        <div className="dash-chart-card">
          <ApiKeySettingsPanel
            initialKeys={apiKeys.map((key) => ({
              ...key,
              scopes: normalizeApiKeyScopes(key.scopes),
              createdAt: key.createdAt.toISOString(),
              lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
              expiresAt: key.expiresAt?.toISOString() ?? null,
            }))}
            turnstileSiteKey={siteKey}
            disabled={!apiKeysAllowed}
          />
        </div>
      </section>
    </div>
  );
}
