import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/webhook-intake", () => ({
  resolveWebhookAccess: vi.fn(async () => ({
    workspaceId: "ws-1",
    integrationId: "int-1",
    mode: "hmac",
  })),
}));
vi.mock("@/lib/incident-service", () => ({
  createIncidentRecord: vi.fn(async (input: Record<string, unknown>) => ({ id: "inc-1", title: input.title })),
  findIncidentBySourceTicketRef: vi.fn(async () => null),
}));
vi.mock("@/lib/policy", () => ({
  enforceWorkspaceQuota: vi.fn(async () => ({ allowed: true, limit: 50, used: 0 })),
  consumeWorkspaceQuota: vi.fn(async () => {}),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
  },
}));
vi.mock("@/lib/read-models", () => ({ refreshWorkspaceReadModels: vi.fn(async () => {}) }));

function req(body: Record<string, unknown>): NextRequest {
  return new NextRequest(new URL("http://localhost:3000/api/webhooks/datadog"), {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/webhooks/datadog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates incident from valid Datadog payload", async () => {
    const { POST } = await import("@/app/api/webhooks/datadog/route");
    const res = await POST(req({ title: "CPU spike", body: "Host xyz CPU > 95%", priority: "P1" }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.incidentId).toBe("inc-1");
  });

  it("returns 401 when webhook access denied", async () => {
    const { resolveWebhookAccess } = await import("@/lib/webhook-intake");
    vi.mocked(resolveWebhookAccess).mockResolvedValueOnce(null);
    const { POST } = await import("@/app/api/webhooks/datadog/route");
    const res = await POST(req({ title: "test" }));
    expect(res.status).toBe(401);
  });

  it("deduplicates by sourceTicketRef", async () => {
    const { findIncidentBySourceTicketRef } = await import("@/lib/incident-service");
    vi.mocked(findIncidentBySourceTicketRef).mockResolvedValueOnce({ id: "existing-1" } as never);
    const { POST } = await import("@/app/api/webhooks/datadog/route");
    const res = await POST(req({ title: "dup", id: "dd-123" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.deduplicated).toBe(true);
  });

  it("returns 429 when quota exceeded", async () => {
    const { enforceWorkspaceQuota } = await import("@/lib/policy");
    vi.mocked(enforceWorkspaceQuota).mockResolvedValueOnce({ allowed: false, limit: 5, used: 5 } as never);
    const { POST } = await import("@/app/api/webhooks/datadog/route");
    const res = await POST(req({ title: "over quota" }));
    expect(res.status).toBe(429);
  });
});

describe("POST /api/webhooks/sentry", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates incident from Sentry payload", async () => {
    const { POST } = await import("@/app/api/webhooks/sentry/route");
    const res = await POST(req({ event: { title: "TypeError in handler" }, action: "created" }));
    expect(res.status).toBe(201);
  });
});

describe("POST /api/webhooks/langfuse", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates incident from Langfuse payload", async () => {
    const { POST } = await import("@/app/api/webhooks/langfuse/route");
    const res = await POST(req({ title: "Hallucination detected", eventType: "hallucination" }));
    expect(res.status).toBe(201);
  });
});
