import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { redisIncrementWithExpiry } from "@/lib/redis";

const AUTH_RATE_LIMIT_WINDOW_SECONDS = 60;
const AUTH_RATE_LIMIT_MAX_REQUESTS = 10;

function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

function rateLimitKey(ip: string, endpoint: string): string {
  const hash = createHash("sha256").update(ip).digest("hex").slice(0, 16);
  return `auth:ratelimit:${endpoint}:${hash}`;
}

export async function enforceAuthRateLimit(
  request: NextRequest,
  endpoint: string,
): Promise<NextResponse | null> {
  const ip = clientIp(request);
  const key = rateLimitKey(ip, endpoint);
  const current = await redisIncrementWithExpiry(key, AUTH_RATE_LIMIT_WINDOW_SECONDS);

  if (current > AUTH_RATE_LIMIT_MAX_REQUESTS) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(AUTH_RATE_LIMIT_WINDOW_SECONDS),
        },
      },
    );
  }

  return null;
}
