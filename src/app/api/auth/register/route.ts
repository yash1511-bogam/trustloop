import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { redisSetJson } from "@/lib/redis";
import { sendEmailOtpLoginOrCreate } from "@/lib/stytch";

const registerStartSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.email().max(160),
  workspaceName: z.string().min(2).max(80),
});

type PendingRegisterPayload = {
  name: string;
  email: string;
  workspaceName: string;
  stytchUserId: string;
};

function pendingRegisterKey(methodId: string): string {
  return `auth:register:${methodId}`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const parsed = registerStartSchema.safeParse(body);

  if (!parsed.success) {
    return badRequest("Invalid registration payload.");
  }

  const email = parsed.data.email.toLowerCase().trim();

  const existing = await prisma.user.findFirst({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 },
    );
  }

  try {
    const otp = await sendEmailOtpLoginOrCreate(email);

    const pendingPayload: PendingRegisterPayload = {
      name: parsed.data.name.trim(),
      email,
      workspaceName: parsed.data.workspaceName.trim(),
      stytchUserId: otp.stytchUserId,
    };

    await redisSetJson<PendingRegisterPayload>(
      pendingRegisterKey(otp.methodId),
      pendingPayload,
      15 * 60,
    );

    return NextResponse.json({
      methodId: otp.methodId,
      message: "A verification code has been sent to your email.",
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to start registration challenge." },
      { status: 400 },
    );
  }
}
