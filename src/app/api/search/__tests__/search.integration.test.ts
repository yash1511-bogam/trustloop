import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-guard", () => ({
  requireApiAuthAndRateLimit: vi.fn(async () => ({
    auth: { kind: "session", workspaceId: "ws-1", actorUserId: "user-1", user: { id: "user-1", name: "Alice", email: "alice@test.local", role: "OWNER", workspaceId: "ws-1", workspaceName: "Test WS", stytchUserId: "stytch-1" }, apiKey: null },
    response: null,
    rateLimit: { allowed: true, limit: 100, remaining: 99, retryAfterSeconds: 0 },
  })),
  withRateLimitHeaders: vi.fn((res: unknown) => res),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    incident: { findMany: vi.fn(async () => []) },
    $queryRaw: vi.fn(async () => []),
  },
}));

function req(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), { method: "GET" });
}

describe("GET /api/search/global", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects missing query", async () => {
    const { GET } = await import("@/app/api/search/global/route");
    const res = await GET(req("/api/search/global"));
    expect(res.status).toBe(400);
  });

  it("returns results for valid query", async () => {
    const { GET } = await import("@/app/api/search/global/route");
    const res = await GET(req("/api/search/global?q=test"));
    expect(res.status).toBe(200);
  });
});
