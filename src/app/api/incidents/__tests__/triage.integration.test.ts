import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = {
  kind: "session" as const,
  workspaceId: "ws-1",
  actorUserId: "user-1",
  user: { id: "user-1", name: "Alice", email: "a@t.l", role: "OWNER" as const, workspaceId: "ws-1", workspaceName: "WS", stytchUserId: "s1" },
  apiKey: null,
};
const mockRL = { allowed: true, limit: 100, remaining: 99, retryAfterSeconds: 0 };

vi.mock("@/lib/api-guard", () => ({
  requireApiAuthAndRateLimit: vi.fn(async () => ({ auth: mockAuth, response: null, rateLimit: mockRL })),
  withRateLimitHeaders: vi.fn((r: unknown) => r),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    incident: { findFirst: vi.fn(async () => ({ id: "inc-1", title: "T", description: "D", workspaceId: "ws-1", firstRespondedAt: null, triageRunCount: 0 })), update: vi.fn(async () => ({ id: "inc-1" })) },
    workflowSetting: { findUnique: vi.fn(async () => ({ provider: "OPENAI", model: "gpt-4o-mini" })) },
    aiProviderKey: { findUnique: vi.fn(async () => ({ encryptedKey: "enc", isActive: true })) },
    workspaceQuota: { findUnique: vi.fn(async () => ({ reminderIntervalHoursP1: 4, reminderIntervalHoursP2: 24 })) },
    workspace: { findUnique: vi.fn(async () => null) },
    incidentEvent: { create: vi.fn(async () => ({})) },
    reminderJobLog: { create: vi.fn(async () => ({})) },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => { const { prisma } = await import("@/lib/prisma"); return fn(prisma); }),
  },
}));
vi.mock("@/lib/audit", () => ({ recordAuditLog: vi.fn(async () => {}), recordAuditForAccess: vi.fn(async () => {}) }));
vi.mock("@/lib/policy", () => ({ enforceWorkspaceQuota: vi.fn(async () => ({ allowed: true, limit: 50, used: 0 })), consumeWorkspaceQuota: vi.fn(async () => {}) }));
vi.mock("@/lib/encryption", () => ({ decryptSecret: vi.fn(() => "sk-test-key") }));
vi.mock("@/lib/ai/service", () => ({
  generateIncidentTriage: vi.fn(async () => ({ severity: "P1", category: "HALLUCINATION", summary: "AI summary", nextSteps: ["Step 1"] })),
  AiProviderError: class extends Error { code: string; retryAfterSeconds?: number; constructor(m: string, c: string) { super(m); this.code = c; } },
}));
vi.mock("@/lib/queue", () => import("@/test/mock-queue"));
vi.mock("@/lib/read-models", () => ({ refreshWorkspaceReadModels: vi.fn(async () => {}) }));
vi.mock("@/lib/slack", () => ({ postIncidentAlert: vi.fn(async () => null) }));
vi.mock("@/lib/incident-push", () => ({ notifyIncidentPush: vi.fn() }));
vi.mock("@/lib/outbound-webhooks", () => ({ dispatchOutboundWebhookEvent: vi.fn(async () => {}) }));

function req(): NextRequest {
  return new NextRequest(new URL("http://localhost:3000/api/incidents/inc-1/triage"), { method: "POST" });
}
const params = Promise.resolve({ id: "inc-1" });

describe("POST /api/incidents/[id]/triage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns triage result on success", async () => {
    const { POST } = await import("@/app/api/incidents/[id]/triage/route");
    const res = await POST(req(), { params });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.triage.severity).toBe("P1");
    expect(json.triage.category).toBe("HALLUCINATION");
  });

  it("returns 404 when incident not found", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.incident.findFirst).mockResolvedValueOnce(null);
    const { POST } = await import("@/app/api/incidents/[id]/triage/route");
    const res = await POST(req(), { params });
    expect(res.status).toBe(404);
  });

  it("returns 429 when triage quota exceeded", async () => {
    const { enforceWorkspaceQuota } = await import("@/lib/policy");
    vi.mocked(enforceWorkspaceQuota).mockResolvedValueOnce({ allowed: false, limit: 10, used: 10 } as never);
    const { POST } = await import("@/app/api/incidents/[id]/triage/route");
    const res = await POST(req(), { params });
    expect(res.status).toBe(429);
  });

  it("returns 400 when no active AI key", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.aiProviderKey.findUnique).mockResolvedValueOnce(null);
    const { POST } = await import("@/app/api/incidents/[id]/triage/route");
    const res = await POST(req(), { params });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/API key/i);
  });
});
