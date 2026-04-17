
import { cache } from "react";
import { createHash } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { authenticateAppSession, isAppSessionToken } from "@/lib/app-session";
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
  user: AuthContext["user"];
  expiresAtIso: string;
};

type SessionUserRecord = {
  id: string;
  name: string;
  email: string;
  role: Role;
  workspaceId: string;
  stytchUserId: string;
  workspace: {
    name: string;
  };
};

function sessionCacheKey(sessionToken: string): string {
  const digest = createHash("sha256").update(sessionToken).digest("hex");
  return `session:auth:${digest}`;
}

export async function getAuth(options?: { skipDevFallback?: boolean }): Promise<AuthContext | null> {
  const store = await cookies();
  const sessionToken = store.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    if (process.env.NODE_ENV === "development" && !options?.skipDevFallback) {
      const devUser = await prisma.user.findFirst({
        where: { email: "demo@trustloop.local" },
        include: { workspace: true },
      });
      if (devUser) {
        return {
          user: {
            id: devUser.id,
            name: devUser.name,
            email: devUser.email,
            role: devUser.role,
            workspaceId: devUser.workspaceId,
            workspaceName: devUser.workspace.name,
            stytchUserId: devUser.stytchUserId,
          },
        };
      }
    }
    return null;
  }

  const cacheKey = sessionCacheKey(sessionToken);
  const cached = await redisGetJson<CachedSessionAuth>(cacheKey);

  if (cached) {
    const parsedExpiry = new Date(cached.expiresAtIso);
    if (parsedExpiry.getTime() > Date.now()) {
      return {
        user: cached.user,
      };
    }

    await redisDelete(cacheKey);
  }

  let expiresAt: Date;
  let user: SessionUserRecord | null = null;
  try {
    if (isAppSessionToken(sessionToken)) {
      const validated = await authenticateAppSession(sessionToken);
      expiresAt = validated.expiresAt;
      user = await prisma.user.findUnique({
        where: { id: validated.userId },
        include: { workspace: true },
      });
    } else {
      const validated = await authenticateSessionToken(sessionToken);
      expiresAt = validated.expiresAt;
      user = await prisma.user.findUnique({
        where: { stytchUserId: validated.stytchUserId },
        include: { workspace: true },
      });
    }
  } catch {
    return null;
  }

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
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        workspaceId: user.workspaceId,
        workspaceName: user.workspace.name,
        stytchUserId: user.stytchUserId,
      },
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

export const requireAuth: () => Promise<AuthContext> = cache(async () => {
  const auth = await getAuth();
  if (!auth) {
    redirect("/");
  }
  return auth;
});

export function hasRole(auth: AuthContext, allowedRoles: Role[]): boolean {
  return allowedRoles.includes(auth.user.role);
}
