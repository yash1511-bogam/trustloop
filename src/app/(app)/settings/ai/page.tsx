import { AiSettingsPanel } from "@/components/ai-settings-panel";
import { ApiKeySettingsPanel } from "@/components/api-key-settings-panel";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SettingsAiPage() {
  const auth = await requireAuth();

  const [keys, workflows, apiKeys] = await Promise.all([
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
      select: {
        workflowType: true,
        provider: true,
        model: true,
      },
      orderBy: { workflowType: "asc" },
    }),
    prisma.workspaceApiKey.findMany({
      where: { workspaceId: auth.user.workspaceId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        isActive: true,
        createdAt: true,
        lastUsedAt: true,
      },
    }),
  ]);

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
        <AiSettingsPanel
          keys={keys.map((key) => ({
            ...key,
            lastVerifiedAt: key.lastVerifiedAt?.toISOString() ?? null,
            updatedAt: key.updatedAt.toISOString(),
          }))}
          workflows={workflows}
        />
      </section>

      <section className="pb-10">
        <h2 className="text-xl font-medium text-slate-100">Workspace API keys</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Generate and revoke Bearer keys used by monitoring agents and automation clients.
        </p>
        <div className="mt-8">
          <ApiKeySettingsPanel
            initialKeys={apiKeys.map((key) => ({
              ...key,
              createdAt: key.createdAt.toISOString(),
              lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
            }))}
          />
        </div>
      </section>
    </div>
  );
}
