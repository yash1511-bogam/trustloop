import { createHash, randomBytes } from "crypto";
import { compare, hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { redisDelete, redisGetJson, redisSetJson } from "@/lib/redis";

const API_KEY_PREFIX = "sk-tl-";
const API_KEY_CACHE_TTL_SECONDS = 30;

export type ApiKeyIdentity = {
  id: string;
  workspaceId: string;
  name: string;
  keyPrefix: string;
};

type CachedIdentity = {
  identity: ApiKeyIdentity;
};

function tokenCacheKey(token: string): string {
  const digest = createHash("sha256").update(token).digest("hex");
  return `apikey:auth:${digest}`;
}

function parseBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return token.trim();
}

function parseApiKeyPrefix(token: string): string | null {
  if (!token.startsWith(API_KEY_PREFIX)) {
    return null;
  }

  const suffix = token.slice(API_KEY_PREFIX.length);
  const [prefix] = suffix.split(".");
  if (!prefix || prefix.length < 8) {
    return null;
  }

  return prefix.slice(0, 8);
}

export async function authenticateApiKeyRequest(
  request: NextRequest,
): Promise<ApiKeyIdentity | null> {
  const token = parseBearerToken(request);
  if (!token) {
    return null;
  }

  const cacheKey = tokenCacheKey(token);
  const cached = await redisGetJson<CachedIdentity>(cacheKey);
  if (cached?.identity) {
    return cached.identity;
  }

  const keyPrefix = parseApiKeyPrefix(token);
  if (!keyPrefix) {
    return null;
  }

  const row = await prisma.workspaceApiKey.findUnique({
    where: { keyPrefix },
    select: {
      id: true,
      workspaceId: true,
      name: true,
      keyPrefix: true,
      keyHash: true,
      isActive: true,
    },
  });

  if (!row || !row.isActive) {
    return null;
  }

  const isMatch = await compare(token, row.keyHash);
  if (!isMatch) {
    return null;
  }

  const identity: ApiKeyIdentity = {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    keyPrefix: row.keyPrefix,
  };

  await Promise.all([
    prisma.workspaceApiKey.update({
      where: { id: row.id },
      data: { lastUsedAt: new Date() },
    }),
    redisSetJson<CachedIdentity>(
      cacheKey,
      {
        identity,
      },
      API_KEY_CACHE_TTL_SECONDS,
    ),
  ]);

  return identity;
}

export async function createWorkspaceApiKey(input: {
  workspaceId: string;
  name: string;
}): Promise<{
  apiKey: string;
  keyPrefix: string;
  id: string;
  createdAt: Date;
}> {
  const name = input.name.trim();

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const keyPrefix = randomBytes(4).toString("hex");
    const secret = randomBytes(24).toString("base64url");
    const apiKey = `${API_KEY_PREFIX}${keyPrefix}.${secret}`;
    const keyHash = await hash(apiKey, 12);

    try {
      const created = await prisma.workspaceApiKey.create({
        data: {
          workspaceId: input.workspaceId,
          name,
          keyPrefix,
          keyHash,
        },
        select: {
          id: true,
          createdAt: true,
        },
      });

      return {
        apiKey,
        keyPrefix,
        id: created.id,
        createdAt: created.createdAt,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("Unable to generate unique API key prefix.");
}

export async function invalidateApiKeyAuthCache(rawApiKey: string): Promise<void> {
  await redisDelete(tokenCacheKey(rawApiKey));
}
