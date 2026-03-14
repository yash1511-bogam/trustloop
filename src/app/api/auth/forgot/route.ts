import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { startAuthEmailOtp } from "@/lib/auth-email-otp";
import { recordAuditLog } from "@/lib/audit";
import { enforceAuthRateLimit } from "@/lib/auth-rate-limit";
import { badRequest } from "@/lib/http";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { verifyTurnstileToken } from "@/lib/turnstile";

const forgotStartSchema = z.object({
  email: z.email().max(160),
  turnstileToken: z.string().min(1).optional().nullable(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rateLimited = await enforceAuthRateLimit(request, "forgot");
  if (rateLimited) return rateLimited;

  const body = await request.json().catch(() => null);
  const parsed = forgotStartSchema.safeParse(body);

  if (!parsed.success) {
    return badRequest("Invalid forgot-access payload.");
  }

  const email = parsed.data.email.toLowerCase().trim();
  const turnstile = await verifyTurnstileToken({
    request,
    token: parsed.data.turnstileToken,
  });
  if (!turnstile.success) {
    return NextResponse.json(
      { error: "Security verification failed. Try again." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findFirst({
    where: { email },
    select: {
      id: true,
      name: true,
      workspaceId: true,
      workspace: { select: { name: true } },
    },
  });

  if (!user) {
    return NextResponse.json({
      methodId: "no_account_placeholder",
      message: "If an account exists for that email, a recovery code has been sent.",
    });
  }

  try {
    const otp = await startAuthEmailOtp({
      scope: "login",
      purpose: "recovery",
      email,
      payload: {},
    });
    if (!otp.success) {
      log.auth.error("Failed to send forgot-access OTP", {
        email,
        error: otp.error,
      });
      return NextResponse.json({ error: otp.error }, { status: 502 });
    }

    recordAuditLog({ workspaceId: user.workspaceId, actorUserId: user.id, action: "auth.forgot_start", targetType: "user", targetId: user.id, summary: `Recovery OTP requested for ${email}` }).catch(() => {});

    return NextResponse.json({
      methodId: otp.methodId,
      message: "If an account exists for that email, a recovery code has been sent.",
      cooldownSeconds: otp.cooldownSeconds,
    });
  } catch (error) {
    log.auth.error("Failed to start forgot-access challenge", {
      email,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Unable to start recovery challenge." },
      { status: 500 },
    );
  }
}
