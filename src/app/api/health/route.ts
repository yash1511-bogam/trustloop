import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { reminderQueueUrl } from "@/lib/queue";

export async function GET(): Promise<NextResponse> {
  const checks = {
    database: false,
    redis: false,
    reminderQueueConfigured: Boolean(reminderQueueUrl()),
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch {
    checks.database = false;
  }

  try {
    if (!redis) {
      checks.redis = true;
    } else {
      if (redis.status === "wait") {
        await redis.connect();
      }
      const result = await redis.ping();
      checks.redis = result === "PONG";
    }
  } catch {
    checks.redis = false;
  }

  const ok = checks.database && checks.redis && checks.reminderQueueConfigured;

  return NextResponse.json(
    {
      ok,
      checkedAt: new Date().toISOString(),
      checks,
    },
    { status: ok ? 200 : 503 },
  );
}
