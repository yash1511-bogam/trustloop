import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest } from "@/lib/http";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { authChallengeErrorMessage, extractStytchError } from "@/lib/stytch-errors";
import { sendEmailOtpLoginOrCreate } from "@/lib/stytch";

const loginStartSchema = z.object({
  email: z.email().max(160),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const parsed = loginStartSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid login payload.");
  }

  const email = parsed.data.email.toLowerCase().trim();

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
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: "No workspace account found for that email. Create a workspace first." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      methodId: otp.methodId,
      message: "A verification code has been sent to your email.",
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
