import { AiSettingsPanel } from "@/components/ai-settings-panel";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SettingsAiPage() {
  const auth = await requireAuth();
  const [keys, workflows] = await Promise.all([
    prisma.aiProviderKey.findMany({
      where: { workspaceId: auth.user.workspaceId },
      select: {
        provider: true, keyLast4: true, isActive: true, healthStatus: true,
        lastVerifiedAt: true, lastVerificationError: true, updatedAt: true,
      },
      orderBy: { provider: "asc" },
    }),
    prisma.workflowSetting.findMany({
      where: { workspaceId: auth.user.workspaceId },
      select: { workflowType: true, provider: true, model: true },
      orderBy: { workflowType: "asc" },
    }),
  ]);

  return (
    <div className="page-stack">
      <section className="dash-hero section-enter">
        <div className="dash-hero-inner">
          <div className="dash-hero-text">
            <p className="page-kicker">Integrations</p>
            <h1 className="page-title">AI Providers</h1>
          </div>
        </div>
      </section>
      <section className="section-enter">
        <div className="dash-section-header">
          <h2 className="dash-chart-title">AI provider keys</h2>
          <p className="dash-chart-desc">Bring your own keys for OpenAI, Gemini, and Anthropic with explicit workflow mapping.</p>
        </div>
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
      </section>
    </div>
  );
}
