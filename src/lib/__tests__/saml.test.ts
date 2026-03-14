import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/stytch", () => import("@/test/mock-stytch"));
vi.mock("@/lib/email", () => import("@/test/mock-email"));
vi.mock("@/lib/queue", () => import("@/test/mock-queue"));
vi.mock("@/lib/audit", () => ({
  recordAuditLog: vi.fn(async () => {}),
  recordAuditForAccess: vi.fn(async () => {}),
}));
vi.mock("@/lib/cookies", () => ({
  setSessionCookie: vi.fn(),
  clearSessionCookie: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspace: {
      findFirst: vi.fn(async () => null),
      findUnique: vi.fn(async () => null),
    },
    user: {
      findFirst: vi.fn(async () => null),
      create: vi.fn(async (args: { data: Record<string, unknown> }) => ({
        id: "user-new",
        ...args.data,
      })),
      update: vi.fn(async (args: { data: Record<string, unknown> }) => ({
        id: "user-existing",
        ...args.data,
      })),
    },
    workspaceMembership: {
      findUnique: vi.fn(async () => null),
      upsert: vi.fn(async () => ({})),
    },
    workspaceInvite: {
      findFirst: vi.fn(async () => null),
      update: vi.fn(async () => ({})),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      const { prisma } = await import("@/lib/prisma");
      return fn(prisma);
    }),
  },
}));
vi.mock("@/lib/workspace-slug", () => ({
  ensureWorkspaceSlug: vi.fn(async () => {}),
}));
vi.mock("@/lib/workspace-membership", () => ({
  ensureWorkspaceMembership: vi.fn(async () => {}),
}));

import { __stytchState, resetStytchState } from "@/test/mock-stytch";

function callbackReq(token?: string): NextRequest {
  const url = token
    ? `http://localhost:3000/api/auth/saml/callback?token=${token}`
    : "http://localhost:3000/api/auth/saml/callback";
  return new NextRequest(new URL(url), { method: "GET" });
}

const samlWorkspace = {
  id: "ws-saml",
  name: "SAML Corp",
  planTier: "enterprise",
  trialEndsAt: null,
  billing: { status: "ACTIVE" },
};

const samlResult = {
  stytchUserId: "stytch-saml-1",
  email: "alice@samlcorp.com",
  name: "Alice",
  organizationId: "org-saml-1",
  connectionId: "conn-saml-1",
  sessionToken: "saml-session-tok",
  expiresAt: new Date(Date.now() + 3600_000),
};

describe("GET /api/auth/saml/callback", () => {
  beforeEach(() => {
    resetStytchState();
    vi.clearAllMocks();
  });

  it("redirects with error when SAML is not supported", async () => {
    __stytchState.samlSupported = false;
    const { GET } = await import("@/app/api/auth/saml/callback/route");
    const res = await GET(callbackReq("some-token"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("error=saml_not_configured");
  });

  it("redirects with error when token is missing", async () => {
    __stytchState.samlSupported = true;
    const { GET } = await import("@/app/api/auth/saml/callback/route");
    const res = await GET(callbackReq());
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("error=saml_callback_invalid");
  });

  it("redirects with error when workspace not found", async () => {
    __stytchState.samlSupported = true;
    __stytchState.samlResult = samlResult;
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce(null);

    const { GET } = await import("@/app/api/auth/saml/callback/route");
    const res = await GET(callbackReq("valid-token-123"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("error=saml_workspace_not_ready");
  });

  it("signs in existing user with workspace membership", async () => {
    __stytchState.samlSupported = true;
    __stytchState.samlResult = samlResult;
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce(samlWorkspace as never);
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({
      id: "user-existing",
      email: "alice@samlcorp.com",
      stytchUserId: "stytch-saml-1",
      workspaceId: "ws-saml",
    } as never);
    vi.mocked(prisma.workspaceMembership.findUnique).mockResolvedValueOnce({
      role: "MEMBER",
    } as never);

    const { GET } = await import("@/app/api/auth/saml/callback/route");
    const res = await GET(callbackReq("valid-token-123"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/dashboard");
    expect(vi.mocked(prisma.user.update)).toHaveBeenCalled();
  });

  it("creates new user via invite flow", async () => {
    __stytchState.samlSupported = true;
    __stytchState.samlResult = samlResult;
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce(samlWorkspace as never);
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.workspaceInvite.findFirst).mockResolvedValueOnce({
      id: "invite-1",
      role: "MEMBER",
    } as never);

    const { GET } = await import("@/app/api/auth/saml/callback/route");
    const res = await GET(callbackReq("valid-token-123"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/dashboard");
    expect(vi.mocked(prisma.user.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "alice@samlcorp.com",
          workspaceId: "ws-saml",
        }),
      }),
    );
  });

  it("redirects with error when no invite exists for new user", async () => {
    __stytchState.samlSupported = true;
    __stytchState.samlResult = samlResult;
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce(samlWorkspace as never);
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.workspaceInvite.findFirst).mockResolvedValueOnce(null);

    const { GET } = await import("@/app/api/auth/saml/callback/route");
    const res = await GET(callbackReq("valid-token-123"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("error=saml_invite_required");
  });

  it("redirects with error when SAML token authentication fails", async () => {
    __stytchState.samlSupported = true;
    __stytchState.error = new Error("token_invalid");

    const { GET } = await import("@/app/api/auth/saml/callback/route");
    const res = await GET(callbackReq("bad-token-123"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("error=saml_auth_failed");
  });

  it("redirects with error when SAML response has no email", async () => {
    __stytchState.samlSupported = true;
    __stytchState.samlResult = { ...samlResult, email: "" };
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce(samlWorkspace as never);

    const { GET } = await import("@/app/api/auth/saml/callback/route");
    const res = await GET(callbackReq("valid-token-123"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("error=saml_email_missing");
  });
});
