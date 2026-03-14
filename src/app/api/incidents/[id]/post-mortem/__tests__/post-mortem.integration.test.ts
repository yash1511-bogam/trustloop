import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = {
  kind: "session" as const,
  workspaceId: "ws-1",
  actorUserId: "user-1",
  user: { id: "user-1", name: "Alice", email: "alice@test.local", role: "OWNER" as const, workspaceId: "ws-1", workspaceName: "Test WS", stytchUserId: "stytch-1" },
  apiKey: null,
};

vi.mock("server-only", () => ({}));
vi.mock("@/lib/api-guard", () => ({
  requireApiAuthAndRateLimit: vi.fn(async () => ({ auth: mockAuth, response: null, rateLimit: { allowed: true, limit: 100, remaining: 99, retryAfterSeconds: 0 } })),
  withRateLimitHeaders: vi.fn((res: unknown) => res),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    postMortem: { findFirst: vi.fn(async () => null), create: vi.fn(async (args: { data: Record<string, unknown> }) => ({ id: "pm-1", ...args.data, createdAt: new Date() })), update: vi.fn(async (args: { data: Record<string, unknown> }) => ({ id: "pm-1", ...args.data })) },
    incident: { findFirst: vi.fn(async () => null) },
    incidentEvent: { create: vi.fn(async () => ({})) },
    workflowSetting: { findUnique: vi.fn(async () => null) },
    aiProviderKey: { findFirst: vi.fn(async () => null) },
  },
}));

vi.mock("@/lib/audit", () => ({ recordAuditLog: vi.fn(async () => {}), recordAuditForAccess: vi.fn(async () => {}) }));
vi.mock("@/lib/encryption", () => ({ decryptSecret: vi.fn(() => "sk-test") }));

function req(url: string, method: string, body?: unknown): NextRequest {
  const init: RequestInit = { method, headers: { "content-type": "application/json" } };
  if (body) init.body = JSON.stringify(body);
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

describe("POST /api/incidents/[id]/post-mortem", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when incident not found", async () => {
    const { POST } = await import("@/app/api/incidents/[id]/post-mortem/route");
    const res = await POST(req("/api/incidents/inc-1/post-mortem", "POST"), { params: Promise.resolve({ id: "inc-1" }) });
    expect(res.status).toBe(404);
  });

  it("returns 400 when post-mortem already exists", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.incident.findFirst).mockResolvedValueOnce({ id: "inc-1", workspaceId: "ws-1", title: "Test", description: "d", summary: null, postMortem: { id: "pm-1" }, events: [] } as never);
    const { POST } = await import("@/app/api/incidents/[id]/post-mortem/route");
    const res = await POST(req("/api/incidents/inc-1/post-mortem", "POST"), { params: Promise.resolve({ id: "inc-1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 when no AI key configured", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.incident.findFirst).mockResolvedValueOnce({ id: "inc-1", workspaceId: "ws-1", title: "Test", description: "d", summary: null, postMortem: null, events: [] } as never);
    const { POST } = await import("@/app/api/incidents/[id]/post-mortem/route");
    const res = await POST(req("/api/incidents/inc-1/post-mortem", "POST"), { params: Promise.resolve({ id: "inc-1" }) });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/incidents/[id]/post-mortem", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when not found", async () => {
    const { GET } = await import("@/app/api/incidents/[id]/post-mortem/route");
    const res = await GET(req("/api/incidents/inc-1/post-mortem", "GET"), { params: Promise.resolve({ id: "inc-1" }) });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/incidents/[id]/post-mortem", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when not found", async () => {
    const { PATCH } = await import("@/app/api/incidents/[id]/post-mortem/route");
    const res = await PATCH(req("/api/incidents/inc-1/post-mortem", "PATCH", { title: "Updated" }), { params: Promise.resolve({ id: "inc-1" }) });
    expect(res.status).toBe(404);
  });

  it("updates post-mortem when found", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.postMortem.findFirst).mockResolvedValueOnce({ id: "pm-1", incidentId: "inc-1", status: "DRAFT" } as never);
    vi.mocked(prisma.postMortem.update).mockResolvedValueOnce({ id: "pm-1", title: "Updated" } as never);
    const { PATCH } = await import("@/app/api/incidents/[id]/post-mortem/route");
    const res = await PATCH(req("/api/incidents/inc-1/post-mortem", "PATCH", { title: "Updated" }), { params: Promise.resolve({ id: "inc-1" }) });
    expect(res.status).toBe(200);
  });
});
