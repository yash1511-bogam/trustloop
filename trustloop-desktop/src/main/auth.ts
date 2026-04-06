import stytch, { Client, envs } from "stytch";
import { createHash, randomBytes } from "crypto";
import { prisma } from "./db";
import { redisGet, redisSet, redisDel } from "./redis";

let _client: Client | null = null;

function getStytch(): Client {
  if (_client) return _client;
  _client = new stytch.Client({
    project_id: process.env.STYTCH_PROJECT_ID!,
    secret: process.env.STYTCH_SECRET!,
    env: (process.env.STYTCH_ENV ?? "test") === "live" ? envs.live : envs.test,
  });
  return _client;
}

const SESSION_TTL = 30; // seconds

function cacheKey(token: string): string {
  return `session:auth:${createHash("sha256").update(token).digest("hex")}`;
}

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  workspaceId: string;
  workspaceName: string;
  stytchUserId: string;
};

export async function sendOtp(email: string): Promise<{ methodId: string }> {
  const isStub = process.env.TRUSTLOOP_STUB_AUTH === "1";
  if (isStub) return { methodId: `stub-email:${email}` };
  const res = await getStytch().otps.email.loginOrCreate({
    email,
    expiration_minutes: Number(process.env.STYTCH_OTP_EXPIRATION_MINUTES ?? 5),
  });
  return { methodId: res.email_id };
}

export async function verifyOtp(methodId: string, code: string): Promise<{ sessionToken: string; expiresAt: Date; stytchUserId: string }> {
  const isStub = process.env.TRUSTLOOP_STUB_AUTH === "1";
  if (isStub) {
    const expected = process.env.TRUSTLOOP_STUB_OTP_CODE ?? "000000";
    if (code !== expected) throw new Error("Invalid code");
    const email = methodId.replace("stub-email:", "");
    const uid = `stub-user:${Buffer.from(email).toString("hex")}`;
    const exp = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return { sessionToken: `stub-session:${uid}:${exp.getTime()}`, expiresAt: exp, stytchUserId: uid };
  }
  const res = await getStytch().otps.authenticate({
    method_id: methodId,
    code,
    session_duration_minutes: Number(process.env.STYTCH_SESSION_DURATION_MINUTES ?? 1440),
  });
  return {
    sessionToken: res.session_token,
    expiresAt: new Date(res.session?.expires_at ?? Date.now() + 86400000),
    stytchUserId: res.user_id,
  };
}

export async function authenticateSession(sessionToken: string): Promise<AuthUser | null> {
  const key = cacheKey(sessionToken);
  const cached = await redisGet(key);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (new Date(parsed.expiresAtIso).getTime() > Date.now()) return parsed.user;
    } catch {}
  }

  let stytchUserId: string;
  const isStub = process.env.TRUSTLOOP_STUB_AUTH === "1";
  if (sessionToken === "dev-session" && process.env.NODE_ENV === "development") {
    const user = await prisma.user.findFirst({
      where: { email: "demo@trustloop.local" },
      include: { workspace: { select: { name: true } } },
    });
    if (!user) return null;
    return { id: user.id, name: user.name, email: user.email, role: user.role, workspaceId: user.workspaceId, workspaceName: user.workspace.name, stytchUserId: user.stytchUserId };
  } else if (isStub && sessionToken.startsWith("stub-session:")) {
    const parts = sessionToken.replace("stub-session:", "").split(":");
    stytchUserId = parts[0];
    const exp = Number(parts[1]);
    if (exp < Date.now()) return null;
  } else {
    try {
      const res = await getStytch().sessions.authenticate({ session_token: sessionToken });
      stytchUserId = res.session.user_id;
    } catch { return null; }
  }

  const user = await prisma.user.findFirst({
    where: { stytchUserId },
    include: { workspace: { select: { name: true } } },
  });
  if (!user) return null;

  const authUser: AuthUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    workspaceId: user.workspaceId,
    workspaceName: user.workspace.name,
    stytchUserId: user.stytchUserId,
  };

  const expiresAt = new Date(Date.now() + SESSION_TTL * 1000);
  await redisSet(key, JSON.stringify({ user: authUser, expiresAtIso: expiresAt.toISOString() }), SESSION_TTL);
  return authUser;
}

export async function registerUser(opts: {
  name: string; email: string; workspaceName: string;
}): Promise<{ methodId: string }> {
  const { methodId } = await sendOtp(opts.email);
  const key = `desktop:pending-register:${methodId}`;
  await redisSet(key, JSON.stringify(opts), 600);
  return { methodId };
}

export async function verifyRegisterOtp(methodId: string, code: string): Promise<{
  sessionToken: string; stytchUserId: string; name: string; email: string; workspaceName: string;
}> {
  const key = `desktop:pending-register:${methodId}`;
  const raw = await redisGet(key);
  if (!raw) throw new Error("Registration session expired");
  const pending = JSON.parse(raw) as { name: string; email: string; workspaceName: string };
  const result = await verifyOtp(methodId, code);
  await redisDel(key);
  return { ...result, name: pending.name, email: pending.email, workspaceName: pending.workspaceName };
}

export async function getOAuthStartUrl(provider: "google" | "github", intent?: "login" | "register", workspaceName?: string): Promise<string> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://trustloop.yashbogam.me";
  // Request nonce from the web app so it's stored in production Redis
  const res = await fetch(`${appUrl}/api/auth/oauth/desktop/nonce`, { method: "POST" });
  const { nonce } = await res.json() as { nonce: string };
  const params = new URLSearchParams({ nonce });
  if (intent) params.set("intent", intent);
  if (workspaceName) params.set("workspaceName", workspaceName);
  return `${appUrl}/api/auth/oauth/desktop/${provider}?${params.toString()}`;
}
