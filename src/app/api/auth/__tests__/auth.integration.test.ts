import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/* ---- mocks ---- */
vi.mock("@/lib/stytch", () => import("@/test/mock-stytch"));
vi.mock("@/lib/email", () => import("@/test/mock-email"));
vi.mock("@/lib/queue", () => import("@/test/mock-queue"));
vi.mock("@/lib/audit", () => ({
  recordAuditLog: vi.fn(async () => {}),
  recordAuditForAccess: vi.fn(async () => {}),
}));
vi.mock("@/lib/turnstile", () => ({
  verifyTurnstileToken: vi.fn(async () => ({ success: true, errorCodes: [] })),
  isTurnstileEnabled: vi.fn(() => false),
  turnstileSiteKey: vi.fn(() => null),
}));
vi.mock("@/lib/cookies", () => ({
  setSessionCookie: vi.fn(),
  clearSessionCookie: vi.fn(),
}));
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
    redisIncrementWithExpiry: vi.fn(async () => 1),
  };
});
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(async () => null),
      findUnique: vi.fn(async () => null),
      create: vi.fn(async (args: { data: Record<string, unknown> }) => ({
        id: "user-1",
        email: args.data.email,
        name: args.data.name,
        role: args.data.role ?? "OWNER",
        workspaceId: args.data.workspaceId,
        stytchUserId: args.data.stytchUserId,
      })),
      update: vi.fn(),
    },
    workspace: {
      findUnique: vi.fn(async () => null),
      create: vi.fn(async (args: { data: Record<string, unknown> }) => ({
        id: "ws-1",
        name: args.data.name,
        slug: args.data.slug,
      })),
    },
    workspaceInvite: {
      findFirst: vi.fn(async () => null),
      findUnique: vi.fn(async () => null),
      update: vi.fn(),
    },
    workflowSetting: { createMany: vi.fn(async () => ({ count: 2 })) },
    workspaceQuota: { create: vi.fn(async () => ({})) },
    workspaceDailyUsage: { upsert: vi.fn(async () => ({})) },
    workspaceMembership: {
      upsert: vi.fn(async () => ({})),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      const { prisma } = await import("@/lib/prisma");
      return fn(prisma);
    }),
  },
}));
vi.mock("@/lib/workspace-slug", () => ({
  slugBaseFromName: vi.fn((name: string) => name.toLowerCase().replace(/\s+/g, "-")),
  createWorkspaceWithGeneratedSlug: vi.fn(async (_tx: unknown, name: string) => ({
    id: "ws-1",
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
  })),
  ensureWorkspaceSlug: vi.fn(async () => {}),
}));
vi.mock("@/lib/workspace-membership", () => ({
  ensureWorkspaceMembership: vi.fn(async () => {}),
}));

import { __stytchState, resetStytchState } from "@/test/mock-stytch";
import { __sentEmails, resetEmails } from "@/test/mock-email";

function req(url: string, body: unknown): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

/* ===== POST /api/auth/register ===== */
describe("POST /api/auth/register", () => {
  beforeEach(() => {
    resetStytchState();
    resetEmails();
    vi.clearAllMocks();
  });

  it("returns methodId on valid payload", async () => {
    const { POST } = await import("@/app/api/auth/register/route");
    const res = await POST(
      req("/api/auth/register", {
        name: "Alice",
        email: "alice@example.com",
        workspaceName: "Acme Inc",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.methodId).toBeDefined();
  });

  it("rejects invalid payload", async () => {
    const { POST } = await import("@/app/api/auth/register/route");
    const res = await POST(req("/api/auth/register", { email: "bad" }));
    expect(res.status).toBe(400);
  });

  it("rejects duplicate workspace slug", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.workspace.findUnique).mockResolvedValueOnce({ id: "existing" } as never);

    const { POST } = await import("@/app/api/auth/register/route");
    const res = await POST(
      req("/api/auth/register", {
        name: "Bob",
        email: "bob@example.com",
        workspaceName: "Taken Corp",
      }),
    );
    expect(res.status).toBe(409);
  });
});

/* ===== POST /api/auth/register/verify ===== */
describe("POST /api/auth/register/verify", () => {
  beforeEach(() => {
    resetStytchState();
    resetEmails();
    vi.clearAllMocks();
  });

  it("returns 400 when registration session expired", async () => {
    const { POST } = await import("@/app/api/auth/register/verify/route");
    const res = await POST(
      req("/api/auth/register/verify", { methodId: "no-such-method", code: "123456" }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/expired/i);
  });

  it("creates user + workspace on valid OTP", async () => {
    // Seed the pending registration in Redis
    const { redisSetJson } = await import("@/lib/redis");
    await redisSetJson("auth:register:method-1", {
      name: "Alice",
      email: "alice@example.com",
      workspaceName: "Acme Inc",
    });

    __stytchState.authResult = {
      stytchUserId: "stytch-alice",
      sessionToken: "tok-1",
      sessionJwt: "jwt-1",
      expiresAt: new Date(Date.now() + 3600_000),
    };

    const { POST } = await import("@/app/api/auth/register/verify/route");
    const res = await POST(
      req("/api/auth/register/verify", { methodId: "method-1", code: "123456" }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.user).toBeDefined();
    expect(json.user.email).toBe("alice@example.com");
  });
});

/* ===== POST /api/auth/login ===== */
describe("POST /api/auth/login", () => {
  beforeEach(() => {
    resetStytchState();
    vi.clearAllMocks();
  });

  it("returns methodId on valid email", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(
      req("/api/auth/login", { email: "alice@example.com" }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.methodId).toBeDefined();
  });

  it("rejects invalid email", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(req("/api/auth/login", { email: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when Stytch throws", async () => {
    __stytchState.error = new Error("stytch_down");
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(
      req("/api/auth/login", { email: "alice@example.com" }),
    );
    expect(res.status).toBe(400);
  });
});

/* ===== POST /api/auth/login/verify ===== */
describe("POST /api/auth/login/verify", () => {
  beforeEach(() => {
    resetStytchState();
    vi.clearAllMocks();
  });

  it("returns 404 when no user found for stytch ID", async () => {
    const { POST } = await import("@/app/api/auth/login/verify/route");
    const res = await POST(
      req("/api/auth/login/verify", { methodId: "method-1", code: "123456" }),
    );
    expect(res.status).toBe(404);
  });

  it("returns user on valid OTP with existing user", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: "user-1",
      name: "Alice",
      email: "alice@example.com",
      workspaceId: "ws-1",
    } as never);

    const { POST } = await import("@/app/api/auth/login/verify/route");
    const res = await POST(
      req("/api/auth/login/verify", { methodId: "method-1", code: "123456" }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.user.email).toBe("alice@example.com");
  });

  it("returns 401 when OTP is invalid", async () => {
    __stytchState.error = new Error("otp_invalid");
    const { POST } = await import("@/app/api/auth/login/verify/route");
    const res = await POST(
      req("/api/auth/login/verify", { methodId: "method-1", code: "000000" }),
    );
    expect(res.status).toBe(401);
  });
});
