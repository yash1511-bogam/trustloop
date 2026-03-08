
import stytch, { B2BClient, Client, envs } from "stytch";
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

function optionalValue(name: string): string | null {
  const value = process.env[name];
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function oauthStartMode(): "b2c" | "b2b_discovery" {
  const mode = (process.env.STYTCH_OAUTH_START_MODE ?? "b2c").toLowerCase().trim();
  return mode === "b2b_discovery" || mode === "b2b-discovery" ? "b2b_discovery" : "b2c";
}

function oauthProviderStartUrl(provider: OAuthProvider): string | null {
  if (provider === "google") {
    return optionalValue("STYTCH_OAUTH_GOOGLE_START_URL") ?? optionalValue("STYTCH_GOOGLE_START_URL");
  }
  return optionalValue("STYTCH_OAUTH_GITHUB_START_URL") ?? optionalValue("STYTCH_GITHUB_START_URL");
}

const globalForStytch = globalThis as unknown as {
  stytchClient?: Client;
  stytchB2BClient?: B2BClient;
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

export const stytchB2BClient =
  globalForStytch.stytchB2BClient ??
  new stytch.B2BClient({
    project_id: requiredValue("STYTCH_PROJECT_ID"),
    secret: requiredValue("STYTCH_SECRET"),
    env: stytchEnvBaseUrl(),
  });

if (process.env.NODE_ENV !== "production") {
  globalForStytch.stytchB2BClient = stytchB2BClient;
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
  if (oauthStartMode() === "b2b_discovery") {
    const response = await stytchB2BClient.sessions.authenticate({
      session_token: sessionToken,
    });

    return {
      stytchUserId: response.member_session.member_id,
      expiresAt: response.member_session.expires_at
        ? new Date(response.member_session.expires_at)
        : new Date(Date.now() + STYTCH_SESSION_DURATION_MINUTES * 60 * 1000),
    };
  }

  const response = await stytchClient.sessions.authenticate({
    session_token: sessionToken,
  });

  return {
    stytchUserId: response.session.user_id,
    expiresAt: response.session.expires_at
      ? new Date(response.session.expires_at)
      : new Date(Date.now() + STYTCH_SESSION_DURATION_MINUTES * 60 * 1000),
  };
}

export async function revokeSessionToken(sessionToken: string): Promise<void> {
  if (oauthStartMode() === "b2b_discovery") {
    await stytchB2BClient.sessions.revoke({
      session_token: sessionToken,
    });
    return;
  }

  await stytchClient.sessions.revoke({
    session_token: sessionToken,
  });
}

export function buildOAuthStartUrl(input: {
  provider: OAuthProvider;
  loginRedirectUrl: string;
  signupRedirectUrl?: string;
}): string {
  const providerStartUrl = oauthProviderStartUrl(input.provider);
  if (providerStartUrl) {
    return providerStartUrl;
  }

  if (oauthStartMode() === "b2b_discovery") {
    const params = new URLSearchParams({
      public_token: requiredValue("STYTCH_PUBLIC_TOKEN"),
    });

    return `${stytchApiOrigin()}/v1/b2b/public/oauth/${input.provider}/discovery/start?${params.toString()}`;
  }

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

function firstDiscoveredOrganizationId(input: {
  discoveredOrganizations: Array<{
    organization?: { organization_id?: string } | null;
    membership?: { member?: { organization_id?: string } | null } | null;
  }>;
}): string | null {
  const fromConfig = optionalValue("STYTCH_B2B_DISCOVERY_ORGANIZATION_ID");
  if (fromConfig) {
    return fromConfig;
  }

  for (const item of input.discoveredOrganizations) {
    const organizationId =
      item.organization?.organization_id ?? item.membership?.member?.organization_id;
    if (organizationId) {
      return organizationId;
    }
  }

  return null;
}

async function authenticateOAuthTokenB2BDiscovery(token: string): Promise<OAuthAuthResult> {
  const discoveryResponse = await stytchB2BClient.oauth.discovery.authenticate({
    discovery_oauth_token: token,
    session_duration_minutes: STYTCH_SESSION_DURATION_MINUTES,
  });

  const organizationId = firstDiscoveredOrganizationId({
    discoveredOrganizations: discoveryResponse.discovered_organizations,
  });
  if (!organizationId) {
    throw new Error("oauth_no_discovered_organization");
  }

  const exchangeResponse = await stytchB2BClient.discovery.intermediateSessions.exchange({
    intermediate_session_token: discoveryResponse.intermediate_session_token,
    organization_id: organizationId,
    session_duration_minutes: STYTCH_SESSION_DURATION_MINUTES,
  });

  if (!exchangeResponse.session_token || !exchangeResponse.session_jwt) {
    throw new Error("oauth_mfa_required");
  }

  const normalizedEmail = discoveryResponse.email_address?.toLowerCase().trim() ?? null;
  const normalizedName =
    exchangeResponse.member?.name?.trim() || discoveryResponse.full_name?.trim() || null;

  return {
    stytchUserId: exchangeResponse.member_id,
    sessionToken: exchangeResponse.session_token,
    sessionJwt: exchangeResponse.session_jwt,
    expiresAt: exchangeResponse.member_session?.expires_at
      ? new Date(exchangeResponse.member_session.expires_at)
      : new Date(Date.now() + STYTCH_SESSION_DURATION_MINUTES * 60 * 1000),
    email: normalizedEmail,
    name: normalizedName,
  };
}

export async function authenticateOAuthToken(token: string): Promise<OAuthAuthResult> {
  if (oauthStartMode() === "b2b_discovery") {
    return authenticateOAuthTokenB2BDiscovery(token);
  }

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
