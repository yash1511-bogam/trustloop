import "server-only";

import Redis from "ioredis";

type MemoryValue = {
  value: string;
  expiresAt: number;
};

const memoryStore = new Map<string, MemoryValue>();

function now(): number {
  return Date.now();
}

function pruneMemoryKey(key: string): void {
  const entry = memoryStore.get(key);
  if (!entry) {
    return;
  }

  if (entry.expiresAt <= now()) {
    memoryStore.delete(key);
  }
}

function redisUrl(): string | null {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }

  if (process.env.REDIS_HOST) {
    const host = process.env.REDIS_HOST;
    const port = process.env.REDIS_PORT ?? "6379";
    const password = process.env.REDIS_PASSWORD;
    if (password) {
      return `redis://:${encodeURIComponent(password)}@${host}:${port}`;
    }
    return `redis://${host}:${port}`;
  }

  return null;
}

const globalForRedis = globalThis as unknown as {
  redis?: Redis;
};

function makeClient(): Redis | undefined {
  const url = redisUrl();
  if (!url) {
    return undefined;
  }

  const client = new Redis(url, {
    lazyConnect: true,
    enableReadyCheck: false,
    maxRetriesPerRequest: 2,
    connectTimeout: 10_000,
  });

  client.on("error", () => {
    // Keep silent to avoid noisy logs in edge/local scenarios.
  });

  return client;
}

export const redis = globalForRedis.redis ?? makeClient();

if (process.env.NODE_ENV !== "production" && redis) {
  globalForRedis.redis = redis;
}

async function withRedis<T>(work: (client: Redis) => Promise<T>): Promise<T | null> {
  if (!redis) {
    return null;
  }

  try {
    if (redis.status === "wait") {
      await redis.connect();
    }
    return await work(redis);
  } catch {
    return null;
  }
}

export function isRedisEnabled(): boolean {
  return Boolean(redis);
}

export async function redisGet(key: string): Promise<string | null> {
  const value = await withRedis((client) => client.get(key));
  if (value !== null) {
    return value;
  }

  pruneMemoryKey(key);
  return memoryStore.get(key)?.value ?? null;
}

export async function redisSet(
  key: string,
  value: string,
  ttlSeconds: number,
): Promise<void> {
  const stored = await withRedis((client) => client.set(key, value, "EX", ttlSeconds));
  if (stored !== null) {
    return;
  }

  memoryStore.set(key, {
    value,
    expiresAt: now() + ttlSeconds * 1000,
  });
}

export async function redisDelete(key: string): Promise<void> {
  await withRedis((client) => client.del(key));
  memoryStore.delete(key);
}

export async function redisIncrementWithExpiry(
  key: string,
  ttlSeconds: number,
): Promise<number> {
  const redisValue = await withRedis(async (client) => {
    const pipeline = client.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, ttlSeconds);
    const result = await pipeline.exec();
    const count = result?.[0]?.[1];
    return typeof count === "number" ? count : Number(count ?? 0);
  });

  if (redisValue !== null) {
    return redisValue;
  }

  pruneMemoryKey(key);
  const existing = memoryStore.get(key);
  const nextValue = Number(existing?.value ?? "0") + 1;
  memoryStore.set(key, {
    value: String(nextValue),
    expiresAt: now() + ttlSeconds * 1000,
  });
  return nextValue;
}

export async function redisGetJson<T>(key: string): Promise<T | null> {
  const raw = await redisGet(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function redisSetJson<T>(
  key: string,
  payload: T,
  ttlSeconds: number,
): Promise<void> {
  await redisSet(key, JSON.stringify(payload), ttlSeconds);
}
