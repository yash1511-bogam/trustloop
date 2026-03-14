import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = {
  kind: "session" as const,
  workspaceId: "ws-1",
  actorUserId: "user-1",
  user: { id: "user-1", name: "Alice", email: "alice@test.local", role: "OWNER" as const, workspaceId: "ws-1", workspaceName: "Test WS", stytchUserId: "stytch-1" },
  apiKey: null,
};

vi.mock("@/lib/api-guard", () => ({
  requireApiAuthAndRateLimit: vi.fn(async () => ({ auth: mockAuth, response: null, rateLimit: { allowed: true, limit: 100, remaining: 99, retryAfterSeconds: 0 } })),
  withRateLimitHeaders: vi.fn((res: unknown) => res),
}));

vi.mock("@/lib/auth", () => ({ hasRole: vi.fn(() => true) }));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    incident: { findMany: vi.fn(async () => []), updateMany: vi.fn(async () => ({ count: 2 })), deleteMany: vi.fn(async () => ({ count: 2 })) },
    incidentEvent: { createMany: vi.fn(async () => ({})) },
    workflowSetting: { findUnique: vi.fn(async () => null) },
    aiProviderKey: { findFirst: vi.fn(async () => null) },
    user: { findMany: vi.fn(async () => []) },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({
      incident: { findMany: vi.fn(async () => [{ id: "inc-00001-a", workspaceId: "ws-1" }, { id: "inc-00002-b", workspaceId: "ws-1" }]), updateMany: vi.fn(async () => ({ count: 2 })), deleteMany: vi.fn(async () => ({ count: 2 })) },
      incidentEvent: { createMany: vi.fn(async () => ({})) },
    })),
  },
}));

vi.mock("@/lib/audit", () => ({ recordAuditLog: vi.fn(async () => {}), recordAuditForAccess: vi.fn(async () => {}) }));
vi.mock("@/lib/policy", () => ({ enforceWorkspaceQuota: vi.fn(async () => ({ allowed: true, limit: 50, used: 0 })), consumeWorkspaceQuota: vi.fn(async () => {}) }));
vi.mock("@/lib/read-models", () => ({ refreshWorkspaceReadModels: vi.fn(async () => {}) }));
vi.mock("@/lib/encryption", () => ({ decryptSecret: vi.fn(() => "test-key") }));
vi.mock("@/lib/incident-push", () => ({ notifyIncidentPush: vi.fn() }));
vi.mock("@/lib/outbound-webhooks", () => ({ dispatchOutboundWebhookEvent: vi.fn(async () => {}) }));
vi.mock("@/lib/sanitize", () => ({ sanitizeLongText: vi.fn((s: string) => s) }));

function req(url: string, method: string, body?: unknown): NextRequest {
  const init: RequestInit = { method, headers: { "content-type": "application/json" } };
  if (body) init.body = JSON.stringify(body);
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

describe("POST /api/incidents/bulk", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects invalid payload", async () => {
    const { POST } = await import("@/app/api/incidents/bulk/route");
    const res = await POST(req("/api/incidents/bulk", "POST", { action: "invalid" }));
    expect(res.status).toBe(400);
  });

  it("rejects empty incidentIds", async () => {
    const { POST } = await import("@/app/api/incidents/bulk/route");
    const res = await POST(req("/api/incidents/bulk", "POST", { incidentIds: [], action: "close" }));
    expect(res.status).toBe(400);
  });

  it("accepts valid close action", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.incident.findMany).mockResolvedValueOnce([
      { id: "inc-00001-aaaa", title: "T1", description: "D1", customerName: null, customerEmail: null, summary: null, status: "NEW" },
      { id: "inc-00002-bbbb", title: "T2", description: "D2", customerName: null, customerEmail: null, summary: null, status: "NEW" },
    ] as never);
    const { POST } = await import("@/app/api/incidents/bulk/route");
    const res = await POST(req("/api/incidents/bulk", "POST", { incidentIds: ["inc-00001-aaaa", "inc-00002-bbbb"], action: "close" }));
    expect([200, 201]).toContain(res.status);
  });
});
