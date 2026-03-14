import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmailOtpLoginOrCreate } from "@/lib/stytch";
import { redisSetJson } from "@/lib/redis";
import { log } from "@/lib/logger";

const schema = z.object({
  name: z.string().min(2).max(80),
  email: z.email().max(160),
  companyName: z.string().max(120).optional(),
});

type PendingEarlyAccess = {
  name: string;
  email: string;
  companyName?: string;
};

function earlyAccessKey(methodId: string): string {
  return `early-access:${methodId}`;
}

export { earlyAccessKey, type PendingEarlyAccess };

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();

  const existing = await prisma.earlyAccessRequest.findUnique({ where: { email } });
  if (existing?.emailVerified) {
    return NextResponse.json({ error: "This email is already on the waitlist." }, { status: 409 });
  }

  try {
    const otp = await sendEmailOtpLoginOrCreate(email);

    await redisSetJson<PendingEarlyAccess>(earlyAccessKey(otp.methodId), {
      name: parsed.data.name.trim(),
      email,
      companyName: parsed.data.companyName?.trim(),
    }, 15 * 60);

    return NextResponse.json({ methodId: otp.methodId, message: "Verification code sent to your email." });
  } catch (error) {
    log.auth.error("Failed to send early access OTP", {
      email,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Unable to send verification code. Try again." }, { status: 500 });
  }
}
