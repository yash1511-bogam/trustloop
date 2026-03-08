
import stytch, { Client, envs } from "stytch";
import {
  STYTCH_OTP_EXPIRATION_MINUTES,
  STYTCH_SESSION_DURATION_MINUTES,
} from "@/lib/constants";

export type OAuthProvider = "google" | "github";

function stytchEnvBaseUrl(): string {
  const env = (process.env.STYTCH_ENV ?? "test").toLowerCase();
  return env === "live" ? envs.live : envs.test;
}

function stytchApiOrigin(): string {
  const env = (process.env.STYTCH_ENV ?? "test").toLowerCase();
  return env === "live" ? "https://api.stytch.com" : "https://test.stytch.com";
}

function requiredValue(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

const globalForStytch = globalThis as unknown as {
  stytchClient?: Client;
};

export const stytchClient =
  globalForStytch.stytchClient ??
  new stytch.Client({
    project_id: requiredValue("STYTCH_PROJECT_ID"),
    secret: requiredValue("STYTCH_SECRET"),
    env: stytchEnvBaseUrl(),
  });

if (process.env.NODE_ENV !== "production") {
  globalForStytch.stytchClient = stytchClient;
}

export type OtpStartResult = {
  methodId: string;
  stytchUserId: string;
  userCreated: boolean;
};

export type OtpAuthResult = {
  stytchUserId: string;
  sessionToken: string;
  sessionJwt: string;
  expiresAt: Date;
};

export async function sendEmailOtpLoginOrCreate(email: string): Promise<OtpStartResult> {
  const response = await stytchClient.otps.email.loginOrCreate({
    email,
    expiration_minutes: STYTCH_OTP_EXPIRATION_MINUTES,
    create_user_as_pending: false,
  });

  return {
    methodId: response.email_id,
    stytchUserId: response.user_id,
    userCreated: response.user_created,
  };
}

export async function authenticateEmailOtp(input: {
  methodId: string;
  code: string;
}): Promise<OtpAuthResult> {
  const response = await stytchClient.otps.authenticate({
    method_id: input.methodId,
    code: input.code,
    session_duration_minutes: STYTCH_SESSION_DURATION_MINUTES,
  });

  return {
    stytchUserId: response.user_id,
    sessionToken: response.session_token,
    sessionJwt: response.session_jwt,
    expiresAt: response.session?.expires_at
      ? new Date(response.session.expires_at)
      : new Date(Date.now() + STYTCH_SESSION_DURATION_MINUTES * 60 * 1000),
  };
}

export async function authenticateSessionToken(sessionToken: string): Promise<{
  stytchUserId: string;
  expiresAt: Date;
}> {
  const response = await stytchClient.sessions.authenticate({
    session_token: sessionToken,
  });

  const expiresAt = new Date(
    response.session.expires_at ??
      new Date(Date.now() + STYTCH_SESSION_DURATION_MINUTES * 60 * 1000).toISOString(),
  );

  return {
    stytchUserId: response.session.user_id,
    expiresAt,
  };
}

export async function revokeSessionToken(sessionToken: string): Promise<void> {
  await stytchClient.sessions.revoke({
    session_token: sessionToken,
  });
}

export function buildOAuthStartUrl(input: {
  provider: OAuthProvider;
  loginRedirectUrl: string;
  signupRedirectUrl?: string;
}): string {
  const params = new URLSearchParams({
    public_token: requiredValue("STYTCH_PUBLIC_TOKEN"),
    login_redirect_url: input.loginRedirectUrl,
    signup_redirect_url: input.signupRedirectUrl ?? input.loginRedirectUrl,
  });

  return `${stytchApiOrigin()}/v1/public/oauth/${input.provider}/start?${params.toString()}`;
}

type OAuthAuthResult = OtpAuthResult & {
  email: string | null;
  name: string | null;
};

function formatName(
  value:
    | {
        first_name?: string;
        middle_name?: string;
        last_name?: string;
      }
    | undefined,
): string | null {
  if (!value) {
    return null;
  }

  const parts = [value.first_name, value.middle_name, value.last_name]
    .map((item) => item?.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  return parts.join(" ").slice(0, 80);
}

export async function authenticateOAuthToken(token: string): Promise<OAuthAuthResult> {
  const response = await stytchClient.oauth.authenticate({
    token,
    session_duration_minutes: STYTCH_SESSION_DURATION_MINUTES,
  });

  const preferredEmail =
    response.user.emails.find((email) => email.verified)?.email ??
    response.user.emails[0]?.email ??
    null;
  const name = formatName(response.user.name);

  return {
    stytchUserId: response.user_id,
    sessionToken: response.session_token,
    sessionJwt: response.session_jwt,
    expiresAt: response.user_session?.expires_at
      ? new Date(response.user_session.expires_at)
      : new Date(Date.now() + STYTCH_SESSION_DURATION_MINUTES * 60 * 1000),
    email: preferredEmail?.toLowerCase().trim() ?? null,
    name,
  };
}
