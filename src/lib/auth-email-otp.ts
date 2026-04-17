import { createHash, randomInt, randomUUID } from "crypto";
import { sendAuthOtpCodeEmail } from "@/lib/email";
import { redisDelete, redisGetJson, redisSetJson } from "@/lib/redis";

export const AUTH_EMAIL_OTP_TTL_SECONDS = 15 * 60;
export const AUTH_EMAIL_OTP_COOLDOWN_SECONDS = 90;

type AuthOtpPurpose = "login" | "register" | "recovery";
type AuthOtpScope = "login" | "register";

type AuthOtpEmailState = {
  methodId: string;
};

export type AuthOtpChallenge<T extends Record<string, unknown>> = T & {
  email: string;
  otpHash: string;
  resendAvailableAt: number;
};

function challengeKey(scope: AuthOtpScope, methodId: string): string {
  return `auth:${scope}:${methodId}`;
}

function challengeEmailKey(scope: AuthOtpScope, email: string): string {
  const emailHash = createHash("sha256").update(email).digest("hex").slice(0, 24);
  return `auth:${scope}:email:${emailHash}`;
}

function generateOtp(): string {
  if (process.env.TRUSTLOOP_STUB_AUTH === "1" && process.env.TRUSTLOOP_STUB_OTP_CODE) {
    return process.env.TRUSTLOOP_STUB_OTP_CODE;
  }
  return String(randomInt(100000, 999999));
}

export async function hashOtp(otp: string): Promise<string> {
  return createHash("sha256").update(otp).digest("hex");
}

function remainingCooldownSeconds(resendAvailableAt: number): number {
  return Math.max(0, Math.ceil((resendAvailableAt - Date.now()) / 1000));
}

export async function startAuthEmailOtp<T extends Record<string, unknown>>(input: {
  scope: AuthOtpScope;
  purpose: AuthOtpPurpose;
  email: string;
  payload: T;
}): Promise<
  | {
      success: true;
      methodId: string;
      cooldownSeconds: number;
      reused: boolean;
    }
  | {
      success: false;
      error: string;
    }
> {
  const email = input.email.toLowerCase().trim();
  const emailKey = challengeEmailKey(input.scope, email);
  const existingState = await redisGetJson<AuthOtpEmailState>(emailKey);

  if (existingState?.methodId) {
    const pending = await redisGetJson<AuthOtpChallenge<T>>(
      challengeKey(input.scope, existingState.methodId),
    );

    if (pending?.email === email) {
      const cooldownSeconds = remainingCooldownSeconds(pending.resendAvailableAt);
      if (cooldownSeconds > 0) {
        await redisSetJson<AuthOtpChallenge<T>>(
          challengeKey(input.scope, existingState.methodId),
          {
            ...pending,
            ...input.payload,
            email,
          },
          AUTH_EMAIL_OTP_TTL_SECONDS,
        );
        await redisSetJson<AuthOtpEmailState>(
          emailKey,
          existingState,
          AUTH_EMAIL_OTP_TTL_SECONDS,
        );

        return {
          success: true,
          methodId: existingState.methodId,
          cooldownSeconds,
          reused: true,
        };
      }

      await redisDelete(challengeKey(input.scope, existingState.methodId));
    }

    await redisDelete(emailKey);
  }

  const otp = generateOtp();
  const methodId = randomUUID();
  const resendAvailableAt = Date.now() + AUTH_EMAIL_OTP_COOLDOWN_SECONDS * 1000;

  await redisSetJson<AuthOtpChallenge<T>>(
    challengeKey(input.scope, methodId),
    {
      ...input.payload,
      email,
      otpHash: await hashOtp(otp),
      resendAvailableAt,
    },
    AUTH_EMAIL_OTP_TTL_SECONDS,
  );
  await redisSetJson<AuthOtpEmailState>(
    emailKey,
    { methodId },
    AUTH_EMAIL_OTP_TTL_SECONDS,
  );

  const result = await sendAuthOtpCodeEmail({
    toEmail: email,
    code: otp,
    purpose: input.purpose,
    idempotencyKey: `auth-otp:${input.scope}:${methodId}`,
  });

  if (!result.success) {
    await redisDelete(challengeKey(input.scope, methodId));
    await redisDelete(emailKey);
    return {
      success: false,
      error: result.error ?? "Unable to send verification code.",
    };
  }

  return {
    success: true,
    methodId,
    cooldownSeconds: AUTH_EMAIL_OTP_COOLDOWN_SECONDS,
    reused: false,
  };
}

export async function verifyAuthEmailOtp<T extends Record<string, unknown>>(
  scope: AuthOtpScope,
  methodId: string,
  code: string,
): Promise<AuthOtpChallenge<T> | null> {
  const pending = await redisGetJson<AuthOtpChallenge<T>>(challengeKey(scope, methodId));
  if (!pending) {
    return null;
  }

  const codeHash = await hashOtp(code.trim());
  if (codeHash !== pending.otpHash) {
    return null;
  }

  return pending;
}

export async function clearAuthEmailOtp(
  scope: AuthOtpScope,
  methodId: string,
  email: string,
): Promise<void> {
  await Promise.all([
    redisDelete(challengeKey(scope, methodId)),
    redisDelete(challengeEmailKey(scope, email.toLowerCase().trim())),
  ]);
}

export function localAuthIdentityForEmail(email: string): string {
  const normalizedEmail = email.toLowerCase().trim();
  const digest = createHash("sha256").update(normalizedEmail).digest("hex");
  return `local-email:${digest}`;
}
