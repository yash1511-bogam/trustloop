import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { requestIpAddress } from "@/lib/api-key-scopes";

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function turnstileSiteKey(): string | null {
  const value = process.env.TURNSTILE_SITE_KEY?.trim();
  return value ? value : null;
}

function turnstileSecretKey(): string | null {
  const value = process.env.TURNSTILE_SECRET_KEY?.trim();
  return value ? value : null;
}

export function isTurnstileEnabled(): boolean {
  return Boolean(turnstileSiteKey() && turnstileSecretKey());
}

export type TurnstileVerificationResult = {
  success: boolean;
  errorCodes: string[];
};

export async function verifyTurnstileToken(input: {
  request: NextRequest;
  token?: string | null;
}): Promise<TurnstileVerificationResult> {
  const secret = turnstileSecretKey();
  if (!secret || !turnstileSiteKey()) {
    return {
      success: true,
      errorCodes: [],
    };
  }

  if (!input.token?.trim()) {
    return {
      success: false,
      errorCodes: ["missing-input-response"],
    };
  }

  const form = new URLSearchParams();
  form.set("secret", secret);
  form.set("response", input.token.trim());
  form.set("idempotency_key", randomUUID());

  const ipAddress = requestIpAddress(input.request);
  if (ipAddress) {
    form.set("remoteip", ipAddress);
  }

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        success: false,
        errorCodes: [`http_${response.status}`],
      };
    }

    const payload = (await response.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };

    return {
      success: payload.success === true,
      errorCodes: payload["error-codes"] ?? [],
    };
  } catch (error) {
    return {
      success: false,
      errorCodes: [error instanceof Error ? error.message : "turnstile_request_failed"],
    };
  }
}
