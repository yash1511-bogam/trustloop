import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceAuthRateLimit } from "@/lib/auth-rate-limit";
import { sendAuthOtpNoticeEmail } from "@/lib/email";
import { badRequest } from "@/lib/http";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { authChallengeErrorMessage, extractStytchError } from "@/lib/stytch-errors";
import { sendEmailOtpLoginOrCreate } from "@/lib/stytch";
import { verifyTurnstileToken } from "@/lib/turnstile";

const loginStartSchema = z.object({
  email: z.email().max(160),
  turnstileToken: z.string().min(1).optional().nullable(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rateLimited = await enforceAuthRateLimit(request, "login");
  if (rateLimited) return rateLimited;

  const body = await request.json().catch(() => null);
  const parsed = loginStartSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid login payload.");
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

  try {
    const otp = await sendEmailOtpLoginOrCreate(email);

    const account = await prisma.user.findFirst({
      where: {
        OR: [
          { stytchUserId: otp.stytchUserId },
          { email },
        ],
      },
      select: {
        id: true,
        name: true,
        workspaceId: true,
        workspace: { select: { name: true } },
      },
    });

    if (!account) {
      log.auth.warn("Login attempt for email with no workspace account", { email });
    }

    if (account?.workspaceId) {
      sendAuthOtpNoticeEmail({
        workspaceId: account.workspaceId,
        toEmail: email,
        workspaceName: account.workspace?.name ?? "your workspace",
        userName: account.name,
      }).catch((err) =>
        log.auth.error("Failed to send OTP notice email", { email, error: err instanceof Error ? err.message : String(err) }),
      );
    }

    // Always return the same response shape to prevent user enumeration
    return NextResponse.json({
      methodId: otp.methodId,
      message: "If an account exists, a verification code has been sent to your email.",
    });
  } catch (error) {
    const stytchError = extractStytchError(error);
    log.auth.error("Failed to start login challenge", {
      email,
      errorType: stytchError?.error_type,
      errorMessage: stytchError?.error_message,
      requestId: stytchError?.request_id,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error: authChallengeErrorMessage(error, "Unable to start login challenge."),
      },
      { status: 400 },
    );
  }
}
