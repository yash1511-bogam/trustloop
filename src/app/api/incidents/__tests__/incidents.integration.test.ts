import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/* ---- shared mock state ---- */
const mockAuth = {
  kind: "session" as const,
  workspaceId: "ws-1",
  actorUserId: "user-1",
  user: {
    id: "user-1",
    name: "Alice",
    email: "alice@test.local",
    role: "OWNER" as const,
    workspaceId: "ws-1",
    workspaceName: "Test WS",
    stytchUserId: "stytch-1",
  },
  apiKey: null,
};

const mockRateLimit = {
  allowed: true,
  limit: 100,
  remaining: 99,
  retryAfterSeconds: 0,
};

/* ---- mocks ---- */
vi.mock("@/lib/api-guard", () => ({
  requireApiAuthAndRateLimit: vi.fn(async () => ({
    auth: mockAuth,
    response: null,
    rateLimit: mockRateLimit,
  })),
  withRateLimitHeaders: vi.fn((res: unknown) => res),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    incident: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => null),
    },
    user: { findMany: vi.fn(async () => []) },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({});
    }),
  },
}));

vi.mock("@/lib/audit", () => ({
  recordAuditLog: vi.fn(async () => {}),
  recordAuditForAccess: vi.fn(async () => {}),
}));

vi.mock("@/lib/policy", () => ({
  enforceWorkspaceQuota: vi.fn(async () => ({ allowed: true, limit: 50, used: 0 })),
  consumeWorkspaceQuota: vi.fn(async () => {}),
}));

vi.mock("@/lib/incident-metadata", () => ({
  loadIncidentTemplate: vi.fn(async () => null),
  applyTemplateToIncidentInput: vi.fn((_t: unknown, input: unknown) => input),
  findPotentialDuplicateIncident: vi.fn(async () => null),
  normalizeTagNames: vi.fn((tags: string[]) => tags),
}));

vi.mock("@/lib/incident-service", () => ({
  createIncidentRecord: vi.fn(async (input: Record<string, unknown>) => ({
    id: "inc-1",
    title: input.title,
    description: input.description,
    severity: input.severity,
    status: "NEW",
    category: input.category,
    channel: input.channel,
    workspaceId: input.workspaceId,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
}));

vi.mock("@/lib/read-models", () => ({
  refreshWorkspaceReadModels: vi.fn(async () => {}),
}));

vi.mock("@/lib/incident-push", () => ({
  notifyIncidentPush: vi.fn(),
}));

vi.mock("@/lib/outbound-webhooks", () => ({
  dispatchOutboundWebhookEvent: vi.fn(async () => {}),
}));

function req(url: string, method: string, body?: unknown): NextRequest {
  const init: RequestInit = { method, headers: { "content-type": "application/json" } };
  if (body) init.body = JSON.stringify(body);
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

/* ===== POST /api/incidents ===== */
describe("POST /api/incidents", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates incident on valid payload", async () => {
    const { POST } = await import("@/app/api/incidents/route");
    const res = await POST(
      req("/api/incidents", "POST", {
        title: "Model hallucination in prod",
        description: "GPT-4 returned fabricated citations in customer-facing output",
        severity: "P1",
        category: "HALLUCINATION",
      }),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.incident.title).toBe("Model hallucination in prod");
  });

  it("rejects invalid payload", async () => {
    const { POST } = await import("@/app/api/incidents/route");
    const res = await POST(
      req("/api/incidents", "POST", { title: "ab" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 409 on duplicate incident", async () => {
    const { findPotentialDuplicateIncident } = await import("@/lib/incident-metadata");
    vi.mocked(findPotentialDuplicateIncident).mockResolvedValueOnce({ id: "dup-1" } as never);

    const { POST } = await import("@/app/api/incidents/route");
    const res = await POST(
      req("/api/incidents", "POST", {
        title: "Duplicate incident",
        description: "This is a duplicate of an existing incident",
      }),
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.duplicateIncidentId).toBe("dup-1");
  });

  it("returns 429 when quota exceeded", async () => {
    const { enforceWorkspaceQuota } = await import("@/lib/policy");
    vi.mocked(enforceWorkspaceQuota).mockResolvedValueOnce({
      allowed: false,
      limit: 5,
      used: 5,
    } as never);

    const { POST } = await import("@/app/api/incidents/route");
    const res = await POST(
      req("/api/incidents", "POST", {
        title: "Over quota incident",
        description: "This should be rejected due to quota limits",
      }),
    );
    expect(res.status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    const { NextResponse } = await import("next/server");
    const { requireApiAuthAndRateLimit } = await import("@/lib/api-guard");
    vi.mocked(requireApiAuthAndRateLimit).mockResolvedValueOnce({
      auth: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      rateLimit: null,
    } as never);

    const { POST } = await import("@/app/api/incidents/route");
    const res = await POST(
      req("/api/incidents", "POST", {
        title: "Should fail auth",
        description: "No session or API key provided",
      }),
    );
    expect(res.status).toBe(401);
  });
});

/* ===== GET /api/incidents ===== */
describe("GET /api/incidents", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty list", async () => {
    const { GET } = await import("@/app/api/incidents/route");
    const res = await GET(req("/api/incidents", "GET"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.incidents).toEqual([]);
  });
});
