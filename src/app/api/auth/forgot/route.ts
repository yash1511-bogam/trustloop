import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { recordAuditLog } from "@/lib/audit";
import { enforceAuthRateLimit } from "@/lib/auth-rate-limit";
import { sendRecoveryInstructionsEmail } from "@/lib/email";
import { badRequest } from "@/lib/http";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { authChallengeErrorMessage, extractStytchError } from "@/lib/stytch-errors";
import { sendEmailOtpLoginOrCreate } from "@/lib/stytch";
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
    const otp = await sendEmailOtpLoginOrCreate(email);

    recordAuditLog({ workspaceId: user.workspaceId, actorUserId: user.id, action: "auth.forgot_start", targetType: "user", targetId: user.id, summary: `Recovery OTP requested for ${email}` }).catch(() => {});

    sendRecoveryInstructionsEmail({
      workspaceId: user.workspaceId,
      toEmail: email,
      workspaceName: user.workspace?.name ?? "your workspace",
      userName: user.name,
    }).catch((err) =>
      log.auth.error("Failed to send recovery instructions email", { email, error: err instanceof Error ? err.message : String(err) }),
    );

    return NextResponse.json({
      methodId: otp.methodId,
      message: "If an account exists for that email, a recovery code has been sent.",
    });
  } catch (error) {
    const stytchError = extractStytchError(error);
    log.auth.error("Failed to start forgot-access challenge", {
      email,
      errorType: stytchError?.error_type,
      errorMessage: stytchError?.error_message,
      requestId: stytchError?.request_id,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error: authChallengeErrorMessage(error, "Unable to start recovery challenge."),
      },
      { status: 400 },
    );
  }
}
