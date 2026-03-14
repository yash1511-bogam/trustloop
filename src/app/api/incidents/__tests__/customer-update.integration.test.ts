import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = {
  kind: "session" as const, workspaceId: "ws-1", actorUserId: "user-1",
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
    incident: { findFirst: vi.fn(async () => ({ id: "inc-1", title: "T", description: "D", status: "INVESTIGATING", summary: "S", workspaceId: "ws-1", events: [] })) },
    workflowSetting: { findUnique: vi.fn(async () => ({ provider: "OPENAI", model: "gpt-4o-mini" })) },
    aiProviderKey: { findUnique: vi.fn(async () => ({ encryptedKey: "enc", isActive: true })) },
    workspace: { findUnique: vi.fn(async () => null), findUniqueOrThrow: vi.fn(async () => ({ customerUpdateApprovalsRequired: 1 })) },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => { const { prisma } = await import("@/lib/prisma"); return fn(prisma); }),
  },
}));
vi.mock("@/lib/auth", () => ({
  getAuth: vi.fn(async () => null),
  requireAuth: vi.fn(async () => ({ user: mockAuth.user })),
  hasRole: vi.fn(() => true),
}));
vi.mock("@/lib/audit", () => ({ recordAuditLog: vi.fn(async () => {}), recordAuditForAccess: vi.fn(async () => {}) }));
vi.mock("@/lib/policy", () => ({ enforceWorkspaceQuota: vi.fn(async () => ({ allowed: true, limit: 50, used: 0 })), consumeWorkspaceQuota: vi.fn(async () => {}) }));
vi.mock("@/lib/encryption", () => ({ decryptSecret: vi.fn(() => "sk-test") }));
vi.mock("@/lib/ai/service", () => ({
  generateCustomerUpdateDraft: vi.fn(async () => "Dear customer, we are investigating the issue."),
  AiProviderError: class extends Error { code: string; constructor(m: string, c: string) { super(m); this.code = c; } },
}));
vi.mock("@/lib/customer-updates", () => ({
  createCustomerUpdateDraft: vi.fn(async () => ({
    id: "draft-1", body: "Dear customer...", status: "DRAFT",
    submittedAt: null, approvedAt: null, rejectedAt: null, publishedAt: null, emailedAt: null,
    createdAt: new Date(), updatedAt: new Date(), approvals: [], author: null,
  })),
  latestCustomerUpdateDraftForIncident: vi.fn(async () => null),
  updateCustomerUpdateDraft: vi.fn(async () => ({})),
  submitCustomerUpdateDraft: vi.fn(async () => ({})),
  decideCustomerUpdateDraft: vi.fn(async () => ({})),
}));
vi.mock("@/lib/outbound-webhooks", () => ({ dispatchOutboundWebhookEvent: vi.fn(async () => {}) }));
vi.mock("@/lib/incident-push", () => ({ notifyIncidentPush: vi.fn() }));
vi.mock("@/lib/slack", () => ({ postSlackMessage: vi.fn(async () => null) }));

function req(method: string, body?: unknown): NextRequest {
  const init: RequestInit = { method, headers: { "content-type": "application/json" } };
  if (body) init.body = JSON.stringify(body);
  return new NextRequest(new URL("http://localhost:3000/api/incidents/inc-1/customer-update"), init);
}
const params = Promise.resolve({ id: "inc-1" });

describe("POST /api/incidents/[id]/customer-update", () => {
  beforeEach(() => vi.clearAllMocks());

  it("generates AI draft on success", async () => {
    const { POST } = await import("@/app/api/incidents/[id]/customer-update/route");
    const res = await POST(req("POST"), { params });
    expect(res.status).toBe(200);
  });

  it("returns 404 when incident not found", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.incident.findFirst).mockResolvedValueOnce(null);
    const { POST } = await import("@/app/api/incidents/[id]/customer-update/route");
    const res = await POST(req("POST"), { params });
    expect(res.status).toBe(404);
  });

  it("returns 429 when quota exceeded", async () => {
    const { enforceWorkspaceQuota } = await import("@/lib/policy");
    vi.mocked(enforceWorkspaceQuota).mockResolvedValueOnce({ allowed: false, limit: 5, used: 5 } as never);
    const { POST } = await import("@/app/api/incidents/[id]/customer-update/route");
    const res = await POST(req("POST"), { params });
    expect(res.status).toBe(429);
  });
});

describe("GET /api/incidents/[id]/customer-update", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when no draft exists", async () => {
    const { GET } = await import("@/app/api/incidents/[id]/customer-update/route");
    const res = await GET(req("GET"), { params });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.draft).toBeNull();
  });
});
