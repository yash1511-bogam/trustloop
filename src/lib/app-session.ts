import { createHash, randomBytes, randomUUID } from "crypto";
import { STYTCH_SESSION_DURATION_MINUTES } from "@/lib/constants";
import { redisDelete, redisGetJson, redisSetJson } from "@/lib/redis";

const APP_SESSION_TOKEN_PREFIX = "trustloop_local_session:";

type StoredAppSession = {
  userId: string;
  expiresAtIso: string;
};

function appSessionKey(sessionToken: string): string {
  const digest = createHash("sha256").update(sessionToken).digest("hex");
  return `session:local:${digest}`;
}

export function isAppSessionToken(sessionToken: string): boolean {
  return sessionToken.startsWith(APP_SESSION_TOKEN_PREFIX);
}

export async function issueAppSession(userId: string): Promise<{
  sessionToken: string;
  expiresAt: Date;
}> {
  const expiresAt = new Date(
    Date.now() + STYTCH_SESSION_DURATION_MINUTES * 60 * 1000,
  );
  const sessionToken = `${APP_SESSION_TOKEN_PREFIX}${randomUUID()}:${randomBytes(24).toString("hex")}`;
  const ttlSeconds = Math.max(
    60,
    Math.floor((expiresAt.getTime() - Date.now()) / 1000),
  );

  await redisSetJson<StoredAppSession>(
    appSessionKey(sessionToken),
    {
      userId,
      expiresAtIso: expiresAt.toISOString(),
    },
    ttlSeconds,
  );

  return { sessionToken, expiresAt };
}

export async function authenticateAppSession(
  sessionToken: string,
): Promise<{ userId: string; expiresAt: Date }> {
  if (!isAppSessionToken(sessionToken)) {
    throw new Error("invalid_app_session");
  }

  const stored = await redisGetJson<StoredAppSession>(appSessionKey(sessionToken));
  if (!stored) {
    throw new Error("app_session_not_found");
  }

  const expiresAt = new Date(stored.expiresAtIso);
  if (expiresAt.getTime() <= Date.now()) {
    await redisDelete(appSessionKey(sessionToken));
    throw new Error("app_session_expired");
  }

  return {
    userId: stored.userId,
    expiresAt,
  };
}

export async function revokeAppSession(sessionToken: string): Promise<void> {
  if (!isAppSessionToken(sessionToken)) {
    return;
  }

  await redisDelete(appSessionKey(sessionToken));
}
