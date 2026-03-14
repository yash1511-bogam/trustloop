import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/dodo", () => ({
  dodoClient: vi.fn(() => ({
    webhooks: {
      unwrap: vi.fn(() => ({
        type: "subscription.active",
        data: { subscription_id: "sub_1", customer_id: "cust_1" },
      })),
    },
  })),
}));

vi.mock("@/lib/billing", () => ({
  processDodoWebhookEvent: vi.fn(async () => ({
    status: "applied",
    workspaceId: "ws-1",
    reason: null,
  })),
}));

vi.mock("@/lib/audit", () => ({
  recordAuditLog: vi.fn(async () => {}),
}));

function req(body: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(new URL("http://localhost:3000/api/billing/webhook"), {
    method: "POST",
    body,
    headers: {
      "content-type": "application/json",
      "webhook-id": "wh_1",
      "webhook-signature": "sig_1",
      "webhook-timestamp": "1234567890",
      ...headers,
    },
  });
}

describe("POST /api/billing/webhook", () => {
  beforeEach(() => vi.clearAllMocks());

  it("processes valid webhook event", async () => {
    const { POST } = await import("@/app/api/billing/webhook/route");
    const res = await POST(req('{"type":"subscription.active"}'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
    expect(json.status).toBe("applied");
  });

  it("returns 400 when signature verification fails", async () => {
    const { dodoClient } = await import("@/lib/dodo");
    vi.mocked(dodoClient).mockReturnValueOnce({
      webhooks: {
        unwrap: () => { throw new Error("Invalid signature"); },
      },
    } as never);

    const { POST } = await import("@/app/api/billing/webhook/route");
    const res = await POST(req('{"type":"bad"}'));
    expect(res.status).toBe(400);
  });

  it("returns 400 when required headers missing", async () => {
    const { POST } = await import("@/app/api/billing/webhook/route");
    const r = new NextRequest(new URL("http://localhost:3000/api/billing/webhook"), {
      method: "POST",
      body: "{}",
      headers: { "content-type": "application/json" },
    });
    const res = await POST(r);
    expect(res.status).toBe(400);
  });
});
