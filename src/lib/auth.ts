import "server-only";

import { createHash } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { SESSION_CACHE_TTL_SECONDS, SESSION_COOKIE_NAME } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { redisDelete, redisGetJson, redisSetJson } from "@/lib/redis";
import { authenticateSessionToken } from "@/lib/stytch";

export type AuthContext = {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    workspaceId: string;
    workspaceName: string;
    stytchUserId: string;
  };
};

type CachedSessionAuth = {
  userId: string;
  stytchUserId: string;
  expiresAtIso: string;
};

function sessionCacheKey(sessionToken: string): string {
  const digest = createHash("sha256").update(sessionToken).digest("hex");
  return `session:auth:${digest}`;
}

export async function getAuth(): Promise<AuthContext | null> {
  const store = await cookies();
  const sessionToken = store.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return null;
  }

  const cacheKey = sessionCacheKey(sessionToken);
  const cached = await redisGetJson<CachedSessionAuth>(cacheKey);

  let stytchUserId: string;
  let expiresAt: Date;

  if (cached) {
    const parsedExpiry = new Date(cached.expiresAtIso);
    if (parsedExpiry.getTime() > Date.now()) {
      stytchUserId = cached.stytchUserId;
      expiresAt = parsedExpiry;
    } else {
      await redisDelete(cacheKey);
      try {
        const validated = await authenticateSessionToken(sessionToken);
        stytchUserId = validated.stytchUserId;
        expiresAt = validated.expiresAt;
      } catch {
        return null;
      }
    }
  } else {
    try {
      const validated = await authenticateSessionToken(sessionToken);
      stytchUserId = validated.stytchUserId;
      expiresAt = validated.expiresAt;
    } catch {
      return null;
    }
  }

  const user = await prisma.user.findUnique({
    where: { stytchUserId },
    include: { workspace: true },
  });

  if (!user) {
    return null;
  }

  const ttl = Math.max(
    5,
    Math.min(
      SESSION_CACHE_TTL_SECONDS,
      Math.floor((expiresAt.getTime() - Date.now()) / 1000),
    ),
  );

  await redisSetJson<CachedSessionAuth>(
    cacheKey,
    {
      userId: user.id,
      stytchUserId: user.stytchUserId,
      expiresAtIso: expiresAt.toISOString(),
    },
    ttl,
  );

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      workspaceId: user.workspaceId,
      workspaceName: user.workspace.name,
      stytchUserId: user.stytchUserId,
    },
  };
}

export async function invalidateSessionAuthCache(sessionToken: string): Promise<void> {
  await redisDelete(sessionCacheKey(sessionToken));
}

export async function requireAuth(): Promise<AuthContext> {
  const auth = await getAuth();
  if (!auth) {
    redirect("/login");
  }
  return auth;
}

export function hasRole(auth: AuthContext, allowedRoles: Role[]): boolean {
  return allowedRoles.includes(auth.user.role);
}
