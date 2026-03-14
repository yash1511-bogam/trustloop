/**
 * Mock for @/lib/stytch — intercepts all Stytch calls in tests.
 *
 * Usage in test files:
 *   vi.mock("@/lib/stytch", () => import("@/test/mock-stytch"));
 *
 * Then control behaviour:
 *   import { __stytchState } from "@/test/mock-stytch";
 *   __stytchState.otpResult = { stytchUserId: "u1", ... };
 */

import { vi } from "vitest";

export const __stytchState = {
  otpResult: null as null | {
    methodId: string;
    stytchUserId: string;
    userCreated: boolean;
  },
  authResult: null as null | {
    stytchUserId: string;
    sessionToken: string;
    sessionJwt: string;
    expiresAt: Date;
  },
  sessionResult: null as null | {
    stytchUserId: string;
    expiresAt: Date;
  },
  samlResult: null as null | {
    stytchUserId: string;
    email: string;
    name: string | null;
    organizationId: string;
    connectionId: string | null;
    sessionToken: string;
    expiresAt: Date;
  },
  samlSupported: false,
  error: null as null | Error,
};

export function resetStytchState() {
  __stytchState.otpResult = null;
  __stytchState.authResult = null;
  __stytchState.sessionResult = null;
  __stytchState.samlResult = null;
  __stytchState.samlSupported = false;
  __stytchState.error = null;
}

export const sendEmailOtpLoginOrCreate = vi.fn(async () => {
  if (__stytchState.error) throw __stytchState.error;
  return (
    __stytchState.otpResult ?? {
      methodId: "email-method-1",
      stytchUserId: "stytch-user-1",
      userCreated: false,
    }
  );
});

export const authenticateEmailOtp = vi.fn(async () => {
  if (__stytchState.error) throw __stytchState.error;
  return (
    __stytchState.authResult ?? {
      stytchUserId: "stytch-user-1",
      sessionToken: "session-token-1",
      sessionJwt: "session-jwt-1",
      expiresAt: new Date(Date.now() + 3600_000),
    }
  );
});

export const authenticateSessionToken = vi.fn(async () => {
  if (__stytchState.error) throw __stytchState.error;
  return (
    __stytchState.sessionResult ?? {
      stytchUserId: "stytch-user-1",
      expiresAt: new Date(Date.now() + 3600_000),
    }
  );
});

export const revokeSessionToken = vi.fn(async () => {});

export const isPendingStytchUserId = vi.fn((id: string) =>
  id.startsWith("pending_email:"),
);

export const stytchAuthMode = vi.fn(() => "b2c" as const);
export const isSamlSsoSupported = vi.fn(() => __stytchState.samlSupported);

export const authenticateSamlToken = vi.fn(async () => {
  if (__stytchState.error) throw __stytchState.error;
  if (!__stytchState.samlResult) throw new Error("SAML not configured");
  return __stytchState.samlResult;
});

export const stytchClient = {};
export const stytchB2BClient = {};
