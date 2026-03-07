import "server-only";

import stytch from "stytch";
import {
  STYTCH_OTP_EXPIRATION_MINUTES,
  STYTCH_SESSION_DURATION_MINUTES,
} from "@/lib/constants";

function stytchEnvBaseUrl(): string {
  const env = (process.env.STYTCH_ENV ?? "test").toLowerCase();
  return env === "live" ? stytch.envs.live : stytch.envs.test;
}

function requiredValue(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

const globalForStytch = globalThis as unknown as {
  stytchClient?: stytch.Client;
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
  };
}

export async function authenticateSessionToken(sessionToken: string): Promise<{
  stytchUserId: string;
  expiresAt: Date;
}> {
  const response = await stytchClient.sessions.authenticate({
    session_token: sessionToken,
  });

  const expiresAt = new Date(response.session.expires_at);

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
