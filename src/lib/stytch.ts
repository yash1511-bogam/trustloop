
import stytch, { B2BClient, Client, envs } from "stytch";
import {
  STYTCH_OTP_EXPIRATION_MINUTES,
  STYTCH_SESSION_DURATION_MINUTES,
} from "@/lib/constants";

export type OAuthProvider = "google" | "github";
type AuthIntent = "login" | "register";
export type StytchAuthMode = "b2c" | "b2b_discovery";
const OTP_PENDING_STYTCH_ID_PREFIX = "pending_email:";
const STYTCH_AUTH_OTP_TEMPLATE_ID = "initial_style_template";
const STUB_METHOD_ID_PREFIX = "stub-email:";
const STUB_SESSION_PREFIX = "stub-session:";

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

function oauthStartMode(): StytchAuthMode {
  const mode = (process.env.STYTCH_OAUTH_START_MODE ?? "b2c").toLowerCase().trim();
  return mode === "b2b_discovery" || mode === "b2b-discovery" ? "b2b_discovery" : "b2c";
}

function isStubAuthEnabled(): boolean {
  return process.env.TRUSTLOOP_STUB_AUTH === "1";
}

function stubOtpCode(): string {
  return process.env.TRUSTLOOP_STUB_OTP_CODE?.trim() || "000000";
}

function stubMethodIdForEmail(email: string): string {
  return `${STUB_METHOD_ID_PREFIX}${email.toLowerCase().trim()}`;
}

function stubEmailForMethodId(methodId: string): string | null {
  if (!methodId.startsWith(STUB_METHOD_ID_PREFIX)) {
    return null;
  }
  const email = methodId.slice(STUB_METHOD_ID_PREFIX.length).trim().toLowerCase();
  return email.includes("@") ? email : null;
}

function stubStytchUserIdForEmail(email: string): string {
  return `stub-user:${Buffer.from(email.toLowerCase().trim()).toString("hex")}`;
}

function stubSessionTokenForUserId(userId: string, expiresAt: Date): string {
  return `${STUB_SESSION_PREFIX}${userId}:${expiresAt.getTime()}`;
}

function parseStubSessionToken(sessionToken: string): {
  stytchUserId: string;
  expiresAt: Date;
} | null {
  if (!sessionToken.startsWith(STUB_SESSION_PREFIX)) {
    return null;
  }

  const raw = sessionToken.slice(STUB_SESSION_PREFIX.length);
  const separator = raw.lastIndexOf(":");
  if (separator === -1) {
    return null;
  }

  const stytchUserId = raw.slice(0, separator);
  const expiresAtMs = Number(raw.slice(separator + 1));
  if (!stytchUserId || !Number.isFinite(expiresAtMs)) {
    return null;
  }

  return {
    stytchUserId,
    expiresAt: new Date(expiresAtMs),
  };
}

export function stytchAuthMode(): StytchAuthMode {
  return oauthStartMode();
}

function oauthProviderStartUrl(provider: OAuthProvider): string | null {
  if (provider === "google") {
    return optionalValue("STYTCH_OAUTH_GOOGLE_START_URL") ?? optionalValue("STYTCH_GOOGLE_START_URL");
  }
  return optionalValue("STYTCH_OAUTH_GITHUB_START_URL") ?? optionalValue("STYTCH_GITHUB_START_URL");
}

function pendingStytchIdForEmail(email: string): string {
  return `${OTP_PENDING_STYTCH_ID_PREFIX}${email.toLowerCase().trim()}`;
}

export function isPendingStytchUserId(stytchUserId: string): boolean {
  return stytchUserId.startsWith(OTP_PENDING_STYTCH_ID_PREFIX);
}

function parseEmailChallengeMethodId(methodId: string): string | null {
  const candidate = methodId.toLowerCase().trim();
  return candidate.includes("@") ? candidate : null;
}

function clampOtpExpirationMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) {
    return 10;
  }
  const rounded = Math.round(minutes);
  return Math.min(15, Math.max(2, rounded));
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
  const normalizedEmail = email.toLowerCase().trim();

  if (isStubAuthEnabled()) {
    return {
      methodId: stubMethodIdForEmail(normalizedEmail),
      stytchUserId: pendingStytchIdForEmail(normalizedEmail),
      userCreated: false,
    };
  }

  if (oauthStartMode() === "b2b_discovery") {
    await stytchB2BClient.otps.email.discovery.send({
      email_address: normalizedEmail,
      discovery_expiration_minutes: clampOtpExpirationMinutes(STYTCH_OTP_EXPIRATION_MINUTES),
      login_template_id: STYTCH_AUTH_OTP_TEMPLATE_ID,
    });

    return {
      methodId: normalizedEmail,
      stytchUserId: pendingStytchIdForEmail(normalizedEmail),
      userCreated: false,
    };
  }

  const response = await stytchClient.otps.email.loginOrCreate({
    email: normalizedEmail,
    expiration_minutes: STYTCH_OTP_EXPIRATION_MINUTES,
    create_user_as_pending: false,
    login_template_id: STYTCH_AUTH_OTP_TEMPLATE_ID,
    signup_template_id: STYTCH_AUTH_OTP_TEMPLATE_ID,
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
  intent?: AuthIntent;
  organizationName?: string;
}): Promise<OtpAuthResult> {
  if (isStubAuthEnabled()) {
    const emailAddress = stubEmailForMethodId(input.methodId);
    if (!emailAddress || input.code.trim() !== stubOtpCode()) {
      throw new Error("otp_invalid");
    }

    const expiresAt = new Date(
      Date.now() + STYTCH_SESSION_DURATION_MINUTES * 60 * 1000,
    );
    const stytchUserId = stubStytchUserIdForEmail(emailAddress);

    return {
      stytchUserId,
      sessionToken: stubSessionTokenForUserId(stytchUserId, expiresAt),
      sessionJwt: "stub-session-jwt",
      expiresAt,
    };
  }

  if (oauthStartMode() === "b2b_discovery") {
    const emailAddress = parseEmailChallengeMethodId(input.methodId);
    if (!emailAddress) {
      throw new Error("otp_invalid_method_id");
    }

    const discoveryResponse = await stytchB2BClient.otps.email.discovery.authenticate({
      email_address: emailAddress,
      code: input.code,
    });

    const session = await exchangeOrCreateB2BDiscoverySession({
      intermediateSessionToken: discoveryResponse.intermediate_session_token,
      discoveredOrganizations: discoveryResponse.discovered_organizations,
      intent: input.intent ?? "login",
      organizationName: input.organizationName,
    });

    return {
      stytchUserId: session.memberId,
      sessionToken: session.sessionToken,
      sessionJwt: session.sessionJwt,
      expiresAt: session.expiresAt,
    };
  }

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
  if (isStubAuthEnabled()) {
    const parsed = parseStubSessionToken(sessionToken);
    if (!parsed) {
      throw new Error("session_invalid");
    }
    return parsed;
  }

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
  if (isStubAuthEnabled()) {
    void sessionToken;
    return;
  }

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

export function isSamlSsoSupported(): boolean {
  return oauthStartMode() === "b2b_discovery" && Boolean(optionalValue("STYTCH_PUBLIC_TOKEN"));
}

type B2BMemberSessionContext = {
  memberId: string;
  organizationId: string;
  organizationSlug: string | null;
  expiresAt: Date;
};

function assertB2BSamlMode(): void {
  if (oauthStartMode() !== "b2b_discovery") {
    throw new Error("saml_requires_b2b_discovery_mode");
  }
}

export async function authenticateB2BMemberSession(
  sessionToken: string,
): Promise<B2BMemberSessionContext> {
  assertB2BSamlMode();

  const response = await stytchB2BClient.sessions.authenticate({
    session_token: sessionToken,
  });

  return {
    memberId: response.member.member_id,
    organizationId: response.member_session.organization_id,
    organizationSlug: response.member_session.organization_slug || null,
    expiresAt: response.member_session.expires_at
      ? new Date(response.member_session.expires_at)
      : new Date(Date.now() + STYTCH_SESSION_DURATION_MINUTES * 60 * 1000),
  };
}

type SyncWorkspaceSamlConnectionInput = {
  organizationId: string;
  metadataUrl: string;
  workspaceName: string;
  connectionId?: string | null;
};

type SyncWorkspaceSamlConnectionResult = {
  organizationId: string;
  connectionId: string;
  idpSsoUrl: string | null;
  status: string | null;
};

export async function syncWorkspaceSamlConnection(
  input: SyncWorkspaceSamlConnectionInput,
): Promise<SyncWorkspaceSamlConnectionResult> {
  assertB2BSamlMode();

  const normalizedMetadataUrl = input.metadataUrl.trim();
  if (!normalizedMetadataUrl) {
    throw new Error("saml_metadata_url_required");
  }

  let connectionId = input.connectionId?.trim() || null;

  if (!connectionId) {
    const created = await stytchB2BClient.sso.saml.createConnection({
      organization_id: input.organizationId,
      display_name: `TrustLoop - ${input.workspaceName.trim().slice(0, 60) || "Workspace"}`,
      identity_provider: "generic",
    });
    connectionId = created.connection?.connection_id ?? null;
  }

  if (!connectionId) {
    throw new Error("saml_connection_create_failed");
  }

  const updated = await stytchB2BClient.sso.saml.updateByURL({
    organization_id: input.organizationId,
    connection_id: connectionId,
    metadata_url: normalizedMetadataUrl,
  });

  return {
    organizationId: input.organizationId,
    connectionId,
    idpSsoUrl: updated.connection?.idp_sso_url ?? null,
    status: updated.connection?.status ?? null,
  };
}

export function buildSamlStartUrl(input: {
  connectionId: string;
  loginRedirectUrl: string;
  signupRedirectUrl?: string;
}): string {
  assertB2BSamlMode();

  const params = new URLSearchParams({
    connection_id: input.connectionId,
    public_token: requiredValue("STYTCH_PUBLIC_TOKEN"),
    login_redirect_url: input.loginRedirectUrl,
    signup_redirect_url: input.signupRedirectUrl ?? input.loginRedirectUrl,
  });

  return `${stytchApiOrigin()}/v1/public/sso/start?${params.toString()}`;
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

export type SamlAuthResult = OtpAuthResult & {
  organizationId: string;
  organizationSlug: string | null;
  email: string | null;
  name: string | null;
  connectionId: string | null;
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

async function exchangeOrCreateB2BDiscoverySession(input: {
  intermediateSessionToken: string;
  discoveredOrganizations: Array<{
    organization?: { organization_id?: string } | null;
    membership?: { member?: { organization_id?: string } | null } | null;
  }>;
  intent: AuthIntent;
  organizationName?: string;
}): Promise<{
  memberId: string;
  sessionToken: string;
  sessionJwt: string;
  expiresAt: Date;
  memberName: string | null;
}> {
  const organizationId = firstDiscoveredOrganizationId({
    discoveredOrganizations: input.discoveredOrganizations,
  });

  if (organizationId) {
    const exchangeResponse = await stytchB2BClient.discovery.intermediateSessions.exchange({
      intermediate_session_token: input.intermediateSessionToken,
      organization_id: organizationId,
      session_duration_minutes: STYTCH_SESSION_DURATION_MINUTES,
    });

    if (!exchangeResponse.session_token || !exchangeResponse.session_jwt) {
      throw new Error("oauth_mfa_required");
    }

    return {
      memberId: exchangeResponse.member_id,
      sessionToken: exchangeResponse.session_token,
      sessionJwt: exchangeResponse.session_jwt,
      expiresAt: exchangeResponse.member_session?.expires_at
        ? new Date(exchangeResponse.member_session.expires_at)
        : new Date(Date.now() + STYTCH_SESSION_DURATION_MINUTES * 60 * 1000),
      memberName: exchangeResponse.member?.name?.trim() || null,
    };
  }

  if (input.intent !== "register") {
    throw new Error("oauth_no_discovered_organization");
  }

  const createResponse = await stytchB2BClient.discovery.organizations.create({
    intermediate_session_token: input.intermediateSessionToken,
    session_duration_minutes: STYTCH_SESSION_DURATION_MINUTES,
    organization_name: input.organizationName?.trim() || undefined,
  });

  if (!createResponse.session_token || !createResponse.session_jwt) {
    throw new Error("oauth_mfa_required");
  }

  return {
    memberId: createResponse.member_id,
    sessionToken: createResponse.session_token,
    sessionJwt: createResponse.session_jwt,
    expiresAt: createResponse.member_session?.expires_at
      ? new Date(createResponse.member_session.expires_at)
      : new Date(Date.now() + STYTCH_SESSION_DURATION_MINUTES * 60 * 1000),
    memberName: createResponse.member?.name?.trim() || null,
  };
}

async function authenticateOAuthTokenB2BDiscovery(input: {
  token: string;
  intent: AuthIntent;
  organizationName?: string;
}): Promise<OAuthAuthResult> {
  const discoveryResponse = await stytchB2BClient.oauth.discovery.authenticate({
    discovery_oauth_token: input.token,
    session_duration_minutes: STYTCH_SESSION_DURATION_MINUTES,
  });

  const session = await exchangeOrCreateB2BDiscoverySession({
    intermediateSessionToken: discoveryResponse.intermediate_session_token,
    discoveredOrganizations: discoveryResponse.discovered_organizations,
    intent: input.intent,
    organizationName: input.organizationName,
  });

  const normalizedEmail = discoveryResponse.email_address?.toLowerCase().trim() ?? null;
  const normalizedName = session.memberName || discoveryResponse.full_name?.trim() || null;

  return {
    stytchUserId: session.memberId,
    sessionToken: session.sessionToken,
    sessionJwt: session.sessionJwt,
    expiresAt: session.expiresAt,
    email: normalizedEmail,
    name: normalizedName,
  };
}

export async function authenticateSamlToken(token: string): Promise<SamlAuthResult> {
  assertB2BSamlMode();

  const response = await stytchB2BClient.sso.authenticate({
    sso_token: token,
    session_duration_minutes: STYTCH_SESSION_DURATION_MINUTES,
  });

  const registrations = response.member.sso_registrations ?? [];
  const latestRegistration =
    registrations.length > 0 ? registrations[registrations.length - 1] : null;

  return {
    stytchUserId: response.member_id,
    sessionToken: response.session_token,
    sessionJwt: response.session_jwt,
    expiresAt: response.member_session?.expires_at
      ? new Date(response.member_session.expires_at)
      : new Date(Date.now() + STYTCH_SESSION_DURATION_MINUTES * 60 * 1000),
    organizationId: response.organization_id,
    organizationSlug: response.member_session?.organization_slug ?? null,
    email: response.member.email_address?.toLowerCase().trim() ?? null,
    name: response.member.name?.trim() || null,
    connectionId: latestRegistration?.connection_id ?? null,
  };
}

export async function authenticateOAuthToken(
  token: string,
  options?: {
    intent?: AuthIntent;
    organizationName?: string;
  },
): Promise<OAuthAuthResult> {
  if (oauthStartMode() === "b2b_discovery") {
    return authenticateOAuthTokenB2BDiscovery({
      token,
      intent: options?.intent ?? "login",
      organizationName: options?.organizationName,
    });
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
