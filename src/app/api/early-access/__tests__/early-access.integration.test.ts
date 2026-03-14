import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/* ---- mocks ---- */
vi.mock("@/lib/stytch", () => import("@/test/mock-stytch"));
vi.mock("@/lib/email", () => import("@/test/mock-email"));
vi.mock("@/lib/redis", () => {
  const store = new Map<string, string>();
  return {
    redis: undefined,
    isRedisEnabled: () => true,
    redisGet: vi.fn(async (k: string) => store.get(k) ?? null),
    redisSet: vi.fn(async (k: string, v: string) => { store.set(k, v); }),
    redisDelete: vi.fn(async (k: string) => { store.delete(k); }),
    redisSetJson: vi.fn(async (k: string, v: unknown) => { store.set(k, JSON.stringify(v)); }),
    redisGetJson: vi.fn(async (k: string) => {
      const raw = store.get(k);
      return raw ? JSON.parse(raw) : null;
    }),
  };
});
vi.mock("@/lib/prisma", () => ({
  prisma: {
    earlyAccessRequest: {
      findUnique: vi.fn(async () => null),
      upsert: vi.fn(async () => ({})),
    },
  },
}));

import { __stytchState, resetStytchState } from "@/test/mock-stytch";
import { __sentEmails, resetEmails } from "@/test/mock-email";
import { redisSetJson, redisDelete } from "@/lib/redis";
import { prisma } from "@/lib/prisma";

function req(url: string, body: unknown): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

/* ===== POST /api/early-access ===== */
describe("POST /api/early-access", () => {
  beforeEach(() => {
    resetStytchState();
    resetEmails();
    vi.clearAllMocks();
  });

  it("returns methodId on valid payload", async () => {
    const { POST } = await import("@/app/api/early-access/route");
    const res = await POST(req("/api/early-access", { name: "Alice", email: "alice@example.com" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.methodId).toBeDefined();
    expect(json.message).toContain("Verification code sent");
  });

  it("accepts optional companyName", async () => {
    const { POST } = await import("@/app/api/early-access/route");
    const res = await POST(req("/api/early-access", { name: "Bob", email: "bob@example.com", companyName: "Acme" }));
    expect(res.status).toBe(200);
  });

  it("rejects missing name", async () => {
    const { POST } = await import("@/app/api/early-access/route");
    const res = await POST(req("/api/early-access", { email: "alice@example.com" }));
    expect(res.status).toBe(400);
  });

  it("rejects missing email", async () => {
    const { POST } = await import("@/app/api/early-access/route");
    const res = await POST(req("/api/early-access", { name: "Alice" }));
    expect(res.status).toBe(400);
  });

  it("rejects invalid email", async () => {
    const { POST } = await import("@/app/api/early-access/route");
    const res = await POST(req("/api/early-access", { name: "Alice", email: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("returns 409 if email already verified", async () => {
    vi.mocked(prisma.earlyAccessRequest.findUnique).mockResolvedValueOnce({ emailVerified: true } as never);
    const { POST } = await import("@/app/api/early-access/route");
    const res = await POST(req("/api/early-access", { name: "Alice", email: "alice@example.com" }));
    expect(res.status).toBe(409);
  });

  it("stores pending data in redis", async () => {
    const { POST } = await import("@/app/api/early-access/route");
    await POST(req("/api/early-access", { name: "Alice", email: "alice@example.com", companyName: "Acme" }));
    expect(redisSetJson).toHaveBeenCalledWith(
      expect.stringContaining("early-access:"),
      expect.objectContaining({ name: "Alice", email: "alice@example.com", companyName: "Acme" }),
      expect.any(Number),
    );
  });

  it("returns 500 when stytch fails", async () => {
    __stytchState.error = new Error("Stytch down");
    const { POST } = await import("@/app/api/early-access/route");
    const res = await POST(req("/api/early-access", { name: "Alice", email: "alice@example.com" }));
    expect(res.status).toBe(500);
  });
});

/* ===== POST /api/early-access/verify ===== */
describe("POST /api/early-access/verify", () => {
  beforeEach(() => {
    resetStytchState();
    resetEmails();
    vi.clearAllMocks();
  });

  it("verifies OTP and upserts early access request", async () => {
    // Seed pending data in redis
    await (redisSetJson as ReturnType<typeof vi.fn>)("early-access:method-1", { name: "Alice", email: "alice@example.com", companyName: "Acme" }, 900);

    const { POST } = await import("@/app/api/early-access/verify/route");
    const res = await POST(req("/api/early-access/verify", { methodId: "method-1", code: "123456" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("upserts prisma record on success", async () => {
    await (redisSetJson as ReturnType<typeof vi.fn>)("early-access:method-1", { name: "Alice", email: "alice@example.com" }, 900);

    const { POST } = await import("@/app/api/early-access/verify/route");
    await POST(req("/api/early-access/verify", { methodId: "method-1", code: "123456" }));
    expect(prisma.earlyAccessRequest.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "alice@example.com" },
        create: expect.objectContaining({ emailVerified: true }),
        update: expect.objectContaining({ emailVerified: true }),
      }),
    );
  });

  it("cleans up redis after verification", async () => {
    await (redisSetJson as ReturnType<typeof vi.fn>)("early-access:method-1", { name: "Alice", email: "alice@example.com" }, 900);

    const { POST } = await import("@/app/api/early-access/verify/route");
    await POST(req("/api/early-access/verify", { methodId: "method-1", code: "123456" }));
    expect(redisDelete).toHaveBeenCalledWith("early-access:method-1");
  });

  it("sends confirmation email on success", async () => {
    await (redisSetJson as ReturnType<typeof vi.fn>)("early-access:method-1", { name: "Alice", email: "alice@example.com" }, 900);

    const { POST } = await import("@/app/api/early-access/verify/route");
    await POST(req("/api/early-access/verify", { methodId: "method-1", code: "123456" }));
    // Allow fire-and-forget promise to settle
    await new Promise((r) => setTimeout(r, 50));
    expect(__sentEmails.some((e) => e.fn === "sendEarlyAccessConfirmationEmail")).toBe(true);
  });

  it("rejects invalid payload", async () => {
    const { POST } = await import("@/app/api/early-access/verify/route");
    const res = await POST(req("/api/early-access/verify", { code: "123" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when session expired (no redis data)", async () => {
    const { POST } = await import("@/app/api/early-access/verify/route");
    const res = await POST(req("/api/early-access/verify", { methodId: "expired-method", code: "123456" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("expired");
  });

  it("returns 401 when OTP is wrong", async () => {
    await (redisSetJson as ReturnType<typeof vi.fn>)("early-access:method-1", { name: "Alice", email: "alice@example.com" }, 900);
    __stytchState.error = new Error("Invalid OTP");

    const { POST } = await import("@/app/api/early-access/verify/route");
    const res = await POST(req("/api/early-access/verify", { methodId: "method-1", code: "000000" }));
    expect(res.status).toBe(401);
  });
});
