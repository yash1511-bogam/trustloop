import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { setSessionCookie } from "@/lib/cookies";
import { badRequest, notFound } from "@/lib/http";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { authenticateEmailOtp } from "@/lib/stytch";

const loginVerifySchema = z.object({
  methodId: z.string().min(6).max(200),
  code: z.string().min(4).max(12),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const parsed = loginVerifySchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid login verification payload.");
  }

  try {
    const authResult = await authenticateEmailOtp({
      methodId: parsed.data.methodId,
      code: parsed.data.code.trim(),
      intent: "login",
    });

    let user = await prisma.user.findUnique({
      where: { stytchUserId: authResult.stytchUserId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user && parsed.data.methodId.includes("@")) {
      const email = parsed.data.methodId.toLowerCase().trim();
      const existingByEmail = await prisma.user.findFirst({
        where: { email },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      if (existingByEmail) {
        await prisma.user
          .update({
            where: { id: existingByEmail.id },
            data: {
              stytchUserId: authResult.stytchUserId,
            },
          })
          .catch(() => null);
        user = existingByEmail;
      }
    }

    if (!user) {
      return notFound("No TrustLoop user found for this Stytch identity.");
    }

    const response = NextResponse.json({
      success: true,
      user,
    });

    setSessionCookie(response, authResult.sessionToken, authResult.expiresAt);
    return response;
  } catch (error) {
    log.auth.error("Failed to verify login OTP", {
      methodId: parsed.data.methodId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Invalid or expired verification code." }, { status: 401 });
  }
}
