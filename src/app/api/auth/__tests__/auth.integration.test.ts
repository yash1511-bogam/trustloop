import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/* ---- mocks ---- */
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
    __resetRedisMock: vi.fn(() => { store.clear(); }),
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
    inviteCode: {
      findUnique: vi.fn(async (args: { where: { code: string } }) => ({
        code: args.where.code,
        used: false,
        email: "alice@example.com",
      })),
      update: vi.fn(async () => ({})),
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
  checkSlugAvailable: vi.fn(async () => true),
  createWorkspaceWithExactSlug: vi.fn(async (_tx: unknown, name: string) => ({
    id: "ws-1",
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
  })),
  ensureWorkspaceSlug: vi.fn(async () => {}),
}));
vi.mock("@/lib/workspace-membership", () => ({
  ensureWorkspaceMembership: vi.fn(async () => {}),
}));

import * as emailModule from "@/lib/email";
import { resetEmails } from "@/test/mock-email";
import * as redisModule from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import * as workspaceSlug from "@/lib/workspace-slug";

const redisMock = redisModule as typeof redisModule & {
  __resetRedisMock: () => void;
};

function req(url: string, body: unknown): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

async function seedAuthChallenge(
  scope: "login" | "register",
  methodId: string,
  payload: Record<string, unknown>,
  code = "123456",
) {
  const { hashOtp } = await import("@/lib/auth-email-otp");
  const otpHash = await hashOtp(code);
  await (redisModule.redisSetJson as unknown as (...args: unknown[]) => Promise<void>)(
    `auth:${scope}:${methodId}`,
    {
      ...payload,
      otpHash,
      resendAvailableAt: Date.now() + 90_000,
    },
    900,
  );
}

/* ===== POST /api/auth/register ===== */
describe("POST /api/auth/register", () => {
  beforeEach(() => {
    resetEmails();
    redisMock.__resetRedisMock();
    vi.clearAllMocks();
  });

  it("returns methodId on valid payload", async () => {
    const { POST } = await import("@/app/api/auth/register/route");
    const res = await POST(
      req("/api/auth/register", {
        name: "Alice",
        email: "alice@example.com",
        workspaceName: "Acme Inc",
        inviteCode: "INVITE-1",
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
    vi.mocked(workspaceSlug.checkSlugAvailable).mockResolvedValueOnce(false as never);

    const { POST } = await import("@/app/api/auth/register/route");
    const res = await POST(
      req("/api/auth/register", {
        name: "Bob",
        email: "alice@example.com",
        workspaceName: "Taken Corp",
        inviteCode: "INVITE-1",
      }),
    );
    expect(res.status).toBe(409);
  });
});

/* ===== POST /api/auth/register/verify ===== */
describe("POST /api/auth/register/verify", () => {
  beforeEach(() => {
    resetEmails();
    redisMock.__resetRedisMock();
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
    await seedAuthChallenge("register", "method-1", {
      name: "Alice",
      email: "alice@example.com",
      workspaceName: "Acme Inc",
    });

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
    resetEmails();
    redisMock.__resetRedisMock();
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
    vi.mocked(emailModule.sendAuthOtpCodeEmail).mockResolvedValueOnce({
      success: false,
      error: "mail_down",
    } as never);
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(
      req("/api/auth/login", { email: "alice@example.com" }),
    );
    expect(res.status).toBe(502);
  });
});

/* ===== POST /api/auth/login/verify ===== */
describe("POST /api/auth/login/verify", () => {
  beforeEach(() => {
    redisMock.__resetRedisMock();
    vi.clearAllMocks();
  });

  it("returns 404 when no user found for stytch ID", async () => {
    await seedAuthChallenge("login", "method-1", {
      email: "missing@example.com",
    });
    const { POST } = await import("@/app/api/auth/login/verify/route");
    const res = await POST(
      req("/api/auth/login/verify", { methodId: "method-1", code: "123456" }),
    );
    expect(res.status).toBe(404);
  });

  it("returns user on valid OTP with existing user", async () => {
    await seedAuthChallenge("login", "method-1", {
      email: "alice@example.com",
    });
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({
      id: "user-1",
      name: "Alice",
      email: "alice@example.com",
      role: "OWNER",
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
    await seedAuthChallenge("login", "method-1", {
      email: "alice@example.com",
    });
    const { POST } = await import("@/app/api/auth/login/verify/route");
    const res = await POST(
      req("/api/auth/login/verify", { methodId: "method-1", code: "000000" }),
    );
    expect(res.status).toBe(401);
  });
});
