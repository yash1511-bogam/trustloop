import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEarlyAccessOtpEmail } from "@/lib/email";
import { redisDelete, redisGetJson, redisSetJson } from "@/lib/redis";
import { log } from "@/lib/logger";
import { createHash, randomInt, randomUUID } from "crypto";

const schema = z.object({
  name: z.string().min(2).max(80),
  email: z.email().max(160),
  companyName: z.string().max(120).optional(),
});
const EARLY_ACCESS_OTP_TTL_SECONDS = 15 * 60;
const EARLY_ACCESS_OTP_COOLDOWN_SECONDS = 90;

type PendingEarlyAccess = {
  name: string;
  email: string;
  companyName?: string;
  otpHash: string;
  resendAvailableAt: number;
};

type EarlyAccessEmailState = {
  methodId: string;
};

function earlyAccessKey(methodId: string): string {
  return `early-access:${methodId}`;
}

function earlyAccessEmailKey(email: string): string {
  const emailHash = createHash("sha256").update(email).digest("hex").slice(0, 24);
  return `early-access:email:${emailHash}`;
}

function generateOtp(): string {
  return String(randomInt(100000, 999999));
}

async function hashOtp(otp: string): Promise<string> {
  return createHash("sha256").update(otp).digest("hex");
}

function remainingCooldownSeconds(resendAvailableAt: number): number {
  return Math.max(0, Math.ceil((resendAvailableAt - Date.now()) / 1000));
}

export {
  EARLY_ACCESS_OTP_COOLDOWN_SECONDS,
  earlyAccessEmailKey,
  earlyAccessKey,
  type PendingEarlyAccess,
  hashOtp,
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const name = parsed.data.name.trim();
  const companyName = parsed.data.companyName?.trim() || undefined;

  const existing = await prisma.earlyAccessRequest.findUnique({ where: { email } });
  if (existing?.emailVerified) {
    return NextResponse.json({ error: "This email is already on the waitlist." }, { status: 409 });
  }

  try {
    const emailKey = earlyAccessEmailKey(email);
    const existingState = await redisGetJson<EarlyAccessEmailState>(emailKey);
    if (existingState?.methodId) {
      const pending = await redisGetJson<PendingEarlyAccess>(earlyAccessKey(existingState.methodId));
      if (pending?.email === email) {
        const cooldownSeconds = remainingCooldownSeconds(pending.resendAvailableAt);
        if (cooldownSeconds > 0) {
          await redisSetJson<PendingEarlyAccess>(earlyAccessKey(existingState.methodId), {
            ...pending,
            name,
            companyName,
          }, EARLY_ACCESS_OTP_TTL_SECONDS);
          await redisSetJson<EarlyAccessEmailState>(emailKey, existingState, EARLY_ACCESS_OTP_TTL_SECONDS);

          return NextResponse.json({
            methodId: existingState.methodId,
            message: `A verification code was already sent. Please wait ${cooldownSeconds}s before requesting another.`,
            cooldownSeconds,
          });
        }

        await redisDelete(earlyAccessKey(existingState.methodId));
      }

      await redisDelete(emailKey);
    }

    const otp = generateOtp();
    const methodId = randomUUID();
    const resendAvailableAt = Date.now() + EARLY_ACCESS_OTP_COOLDOWN_SECONDS * 1000;

    // Store in Redis BEFORE sending email so a Redis failure doesn't
    // cause a false error after the email was already delivered.
    await redisSetJson<PendingEarlyAccess>(earlyAccessKey(methodId), {
      name,
      email,
      companyName,
      otpHash: await hashOtp(otp),
      resendAvailableAt,
    }, EARLY_ACCESS_OTP_TTL_SECONDS);
    await redisSetJson<EarlyAccessEmailState>(emailKey, { methodId }, EARLY_ACCESS_OTP_TTL_SECONDS);

    const result = await sendEarlyAccessOtpEmail({
      toEmail: email,
      code: otp,
      idempotencyKey: `early-access-otp:${methodId}`,
    });
    if (!result.success) {
      await redisDelete(earlyAccessKey(methodId));
      await redisDelete(emailKey);
      log.auth.error("Failed to send early access OTP", {
        email,
        error: result.error ?? "unknown_email_delivery_error",
      });
      return NextResponse.json({ error: "Unable to send verification code. Try again." }, { status: 502 });
    }

    return NextResponse.json({
      methodId,
      message: "Verification code sent to your email.",
      cooldownSeconds: EARLY_ACCESS_OTP_COOLDOWN_SECONDS,
    });
  } catch (error) {
    log.auth.error("Failed to send early access OTP", {
      email,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Unable to send verification code. Try again." }, { status: 500 });
  }
}
