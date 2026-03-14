import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  clearAuthEmailOtp,
  verifyAuthEmailOtp,
} from "@/lib/auth-email-otp";
import { issueAppSession } from "@/lib/app-session";
import { enforceAuthRateLimit } from "@/lib/auth-rate-limit";
import { setSessionCookie } from "@/lib/cookies";
import { badRequest, notFound } from "@/lib/http";
import { workspacePath } from "@/lib/workspace-url";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { ensureWorkspaceSlug } from "@/lib/workspace-slug";
import { recordAuditLog } from "@/lib/audit";
import { requestIpAddress } from "@/lib/api-key-scopes";

const loginVerifySchema = z.object({
  methodId: z.string().min(6).max(200),
  code: z.string().min(4).max(12),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rateLimited = await enforceAuthRateLimit(request, "login-verify");
  if (rateLimited) return rateLimited;

  const body = await request.json().catch(() => null);
  const parsed = loginVerifySchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid login verification payload.");
  }

  try {
    const pending = await verifyAuthEmailOtp("login", parsed.data.methodId, parsed.data.code);
    if (!pending) {
      throw new Error("otp_invalid");
    }

    const user = await prisma.user.findFirst({
      where: { email: pending.email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        workspaceId: true,
      },
    });

    if (!user) {
      return notFound("No TrustLoop user found for this email.");
    }

    const slug = await ensureWorkspaceSlug(prisma, user.workspaceId);
    const redirectTo = slug
      ? workspacePath("/dashboard", slug, user.role)
      : "/dashboard";
    const session = await issueAppSession(user.id);

    const response = NextResponse.json({
      success: true,
      user,
      redirectTo,
    });

    recordAuditLog({
      workspaceId: user.workspaceId,
      action: "auth.login",
      targetType: "User",
      targetId: user.id,
      summary: `User ${user.email} logged in via OTP`,
      actorUserId: user.id,
      ipAddress: requestIpAddress(request),
    }).catch(() => {});

    clearAuthEmailOtp("login", parsed.data.methodId, pending.email).catch((cleanupError) =>
      log.auth.warn("Failed to clear login OTP challenge", {
        methodId: parsed.data.methodId,
        error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
      }),
    );
    setSessionCookie(response, session.sessionToken, session.expiresAt);
    return response;
  } catch (error) {
    log.auth.error("Failed to verify login OTP", {
      methodId: parsed.data.methodId,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json({ error: "Invalid or expired verification code." }, { status: 401 });
  }
}
