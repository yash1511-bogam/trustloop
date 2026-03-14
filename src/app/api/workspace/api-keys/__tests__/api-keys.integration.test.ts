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

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspaceApiKey: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => null),
      update: vi.fn(async () => ({})),
    },
  },
}));

vi.mock("@/lib/api-key-auth", () => ({
  createWorkspaceApiKey: vi.fn(async () => ({ apiKey: "sk-tl-test1234.secret", keyPrefix: "test1234", id: "key-1", createdAt: new Date(), expiresAt: null })),
}));

vi.mock("@/lib/audit", () => ({ recordAuditLog: vi.fn(async () => {}), recordAuditForAccess: vi.fn(async () => {}) }));
vi.mock("@/lib/feature-gate-server", () => ({ isWorkspaceFeatureAllowed: vi.fn(async () => true) }));
vi.mock("@/lib/turnstile", () => ({ verifyTurnstileToken: vi.fn(async () => ({ success: true })), isTurnstileEnabled: vi.fn(() => false) }));

function req(url: string, method: string, body?: unknown): NextRequest {
  const init: RequestInit = { method, headers: { "content-type": "application/json" } };
  if (body) init.body = JSON.stringify(body);
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

describe("GET /api/workspace/api-keys", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty list", async () => {
    const { GET } = await import("@/app/api/workspace/api-keys/route");
    const res = await GET(req("/api/workspace/api-keys", "GET"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.keys).toEqual([]);
  });
});

describe("POST /api/workspace/api-keys", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects invalid payload", async () => {
    const { POST } = await import("@/app/api/workspace/api-keys/route");
    const res = await POST(req("/api/workspace/api-keys", "POST", {}));
    expect(res.status).toBe(400);
  });

  it("creates key with valid payload", async () => {
    const { POST } = await import("@/app/api/workspace/api-keys/route");
    const res = await POST(req("/api/workspace/api-keys", "POST", { name: "My Test Key", usagePreset: "read_only" }));
    expect(res.status).toBe(201);
  });
});

describe("DELETE /api/workspace/api-keys", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects invalid payload", async () => {
    const { DELETE } = await import("@/app/api/workspace/api-keys/route");
    const res = await DELETE(req("/api/workspace/api-keys", "DELETE", {}));
    expect(res.status).toBe(400);
  });
});
