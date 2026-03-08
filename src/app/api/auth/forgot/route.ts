import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest } from "@/lib/http";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { authChallengeErrorMessage, extractStytchError } from "@/lib/stytch-errors";
import { sendEmailOtpLoginOrCreate } from "@/lib/stytch";

const forgotStartSchema = z.object({
  email: z.email().max(160),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const parsed = forgotStartSchema.safeParse(body);

  if (!parsed.success) {
    return badRequest("Invalid forgot-access payload.");
  }

  const email = parsed.data.email.toLowerCase().trim();

  const user = await prisma.user.findFirst({
    where: { email },
    select: {
      id: true,
    },
  });

  if (!user) {
    return NextResponse.json({
      methodId: null,
      message: "If an account exists for that email, a recovery code has been sent.",
    });
  }

  try {
    const otp = await sendEmailOtpLoginOrCreate(email);

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
