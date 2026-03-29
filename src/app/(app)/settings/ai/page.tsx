import { AiSettingsPanel } from "@/components/ai-settings-panel";
import { ApiKeySettingsPanel } from "@/components/api-key-settings-panel";
import { PlanBadge, UpgradeGate } from "@/components/upgrade-gate";
import { requireAuth } from "@/lib/auth";
import { normalizeApiKeyScopes } from "@/lib/api-key-scopes";
import { resolveEffectivePlanTier } from "@/lib/billing-plan";
import { isFeatureAllowed } from "@/lib/feature-gate";
import { prisma } from "@/lib/prisma";
import { isTurnstileEnabled, turnstileSiteKey } from "@/lib/turnstile";

export default async function SettingsAiPage() {
  const auth = await requireAuth();
  const siteKey = isTurnstileEnabled() ? turnstileSiteKey() : null;

  const [keys, workflows, apiKeys, workspace] = await Promise.all([
    prisma.aiProviderKey.findMany({
      where: { workspaceId: auth.user.workspaceId },
      select: {
        provider: true,
        keyLast4: true,
        isActive: true,
        healthStatus: true,
        lastVerifiedAt: true,
        lastVerificationError: true,
        updatedAt: true,
      },
      orderBy: { provider: "asc" },
    }),
    prisma.workflowSetting.findMany({
      where: { workspaceId: auth.user.workspaceId },
      select: { workflowType: true, provider: true, model: true },
      orderBy: { workflowType: "asc" },
    }),
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
      select: {
        planTier: true, trialEndsAt: true,
        billing: { select: { status: true } },
      },
    }),
  ]);

  const effectivePlanTier = resolveEffectivePlanTier({
    planTier: workspace.planTier,
    billingStatus: workspace.billing?.status,
    trialEndsAt: workspace.trialEndsAt,
  });

  const aiAllowed = isFeatureAllowed(effectivePlanTier, "ai_keys");
  const apiKeysAllowed = isFeatureAllowed(effectivePlanTier, "api_keys");

  return (
    <div className="page-stack">
      <section className="dash-hero section-enter">
        <div className="dash-hero-inner">
          <div className="dash-hero-text">
            <p className="page-kicker">Integrations</p>
            <h1 className="page-title">AI & API keys</h1>
          </div>
        </div>
      </section>

      <section className="section-enter" id="providers">
        <div className="dash-section-header">
          <h2 className="dash-chart-title">
            AI provider keys
            <PlanBadge allowed={aiAllowed} planLabel="Starter" />
          </h2>
          <p className="dash-chart-desc">Bring your own keys for OpenAI, Gemini, and Anthropic with explicit workflow mapping.</p>
        </div>
        <UpgradeGate allowed={aiAllowed} planLabel="Starter">
          <div className="dash-chart-card">
            <AiSettingsPanel
              keys={keys.map((key) => ({
                ...key,
                lastVerifiedAt: key.lastVerifiedAt?.toISOString() ?? null,
                updatedAt: key.updatedAt.toISOString(),
              }))}
              workflows={workflows}
            />
          </div>
        </UpgradeGate>
      </section>

      <section className="section-enter" id="api-keys">
        <div className="dash-section-header">
          <h2 className="dash-chart-title">
            Workspace API keys
            <PlanBadge allowed={apiKeysAllowed} planLabel="Pro" />
          </h2>
          <p className="dash-chart-desc">Issue scoped bearer keys for automation and revoke them cleanly when no longer needed.</p>
        </div>
        <UpgradeGate allowed={apiKeysAllowed} planLabel="Pro">
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
            />
          </div>
        </UpgradeGate>
      </section>
    </div>
  );
}
