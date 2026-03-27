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
      <section className="page-header section-enter">
        <div className="page-header-main">
          <p className="page-kicker">Integrations</p>
          <h1 className="page-title">AI & API keys</h1>
          <p className="page-description">
            Configure provider access, workflow routing, and scoped automation credentials.
          </p>
        </div>
      </section>

      <section className="settings-section section-enter" id="providers">
        <div className="settings-section-header">
          <h2 className="settings-section-title">
            AI provider keys
            <PlanBadge allowed={aiAllowed} planLabel="Starter" />
          </h2>
          <p className="settings-section-description">
            Bring your own keys for OpenAI, Gemini, and Anthropic with explicit workflow mapping.
          </p>
        </div>

        <UpgradeGate allowed={aiAllowed} planLabel="Starter">
          <AiSettingsPanel
            keys={keys.map((key) => ({
              ...key,
              lastVerifiedAt: key.lastVerifiedAt?.toISOString() ?? null,
              updatedAt: key.updatedAt.toISOString(),
            }))}
            workflows={workflows}
          />
        </UpgradeGate>
      </section>

      <section className="settings-section section-enter" id="api-keys">
        <div className="settings-section-header">
          <h2 className="settings-section-title">
            Workspace API keys
            <PlanBadge allowed={apiKeysAllowed} planLabel="Pro" />
          </h2>
          <p className="settings-section-description">
            Issue scoped bearer keys for automation and revoke them cleanly when no longer needed.
          </p>
        </div>

        <UpgradeGate allowed={apiKeysAllowed} planLabel="Pro">
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
        </UpgradeGate>
      </section>
    </div>
  );
}
