import { AiSettingsPanel } from "@/components/ai-settings-panel";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const auth = await requireAuth();

  const [keys, workflows] = await Promise.all([
    prisma.aiProviderKey.findMany({
      where: { workspaceId: auth.user.workspaceId },
      select: {
        provider: true,
        keyLast4: true,
        isActive: true,
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
  ]);

  return (
    <div className="space-y-5">
      <section className="surface p-5">
        <h2 className="text-2xl font-semibold">AI provider settings</h2>
        <p className="mt-1 text-sm text-slate-600">
          Configure your own OpenAI, Gemini, and Anthropic API keys plus per-workflow model routing.
        </p>
      </section>

      <section className="surface p-5">
        <AiSettingsPanel
          keys={keys.map((key) => ({
            ...key,
            updatedAt: key.updatedAt.toISOString(),
          }))}
          workflows={workflows}
        />
      </section>
    </div>
  );
}
