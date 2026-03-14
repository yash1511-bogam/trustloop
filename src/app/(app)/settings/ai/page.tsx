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
    <div className="space-y-16 pt-8">
      <section>
        <p className="kicker">AI & access</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-100">Provider and API key controls</h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-500">
          Configure BYOK for OpenAI, Gemini, Anthropic, and map each workflow to the right provider/model pair.
        </p>
      </section>

      <section className="pb-10 border-b border-white/5">
        <h2 className="text-xl font-medium text-slate-100">
          AI provider keys
          <PlanBadge allowed={aiAllowed} planLabel="Starter" />
        </h2>
        <p className="mt-1 text-sm text-neutral-500">Bring your own keys for OpenAI, Gemini, and Anthropic.</p>
        <div className="mt-8">
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
        </div>
      </section>

      <section className="pb-10">
        <h2 className="text-xl font-medium text-slate-100">
          Workspace API keys
          <PlanBadge allowed={apiKeysAllowed} planLabel="Pro" />
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Generate Bearer keys for specific automation use cases, set an expiry window, and revoke them when they are no longer needed.
        </p>
        <div className="mt-8">
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
        </div>
      </section>
    </div>
  );
}
