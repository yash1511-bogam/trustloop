import Redis from "ioredis";

let _redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  _redis = new Redis(url, { maxRetriesPerRequest: 3, lazyConnect: true });
  _redis.connect().catch(() => {});
  return _redis;
}

export async function redisGet(key: string): Promise<string | null> {
  const r = getRedis();
  if (!r) return null;
  return r.get(key);
}

export async function redisSet(key: string, value: string, ttl?: number): Promise<void> {
  const r = getRedis();
  if (!r) return;
  if (ttl) await r.set(key, value, "EX", ttl);
  else await r.set(key, value);
}

export async function redisDel(key: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  await r.del(key);
}

export async function disconnectRedis(): Promise<void> {
  if (_redis) { _redis.disconnect(); _redis = null; }
}
