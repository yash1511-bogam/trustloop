import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { setSessionCookie } from "@/lib/cookies";
import { badRequest, notFound } from "@/lib/http";
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
    });

    const user = await prisma.user.findUnique({
      where: { stytchUserId: authResult.stytchUserId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      return notFound("No TrustLoop user found for this Stytch identity.");
    }

    const response = NextResponse.json({
      success: true,
      user,
    });

    setSessionCookie(response, authResult.sessionToken, authResult.expiresAt);
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid or expired verification code." }, { status: 401 });
  }
}
