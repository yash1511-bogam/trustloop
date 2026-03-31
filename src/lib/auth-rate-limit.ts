import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { requestIpAddress } from "@/lib/api-key-scopes";
import { redisIncrementWithExpiry } from "@/lib/redis";

const AUTH_RATE_LIMIT_WINDOW_SECONDS = 60;
const AUTH_RATE_LIMIT_MAX_REQUESTS = 10;

function rateLimitKey(ip: string, endpoint: string): string {
  const hash = createHash("sha256").update(ip).digest("hex").slice(0, 16);
  return `auth:ratelimit:${endpoint}:${hash}`;
}

export async function enforceAuthRateLimit(
  request: NextRequest,
  endpoint: string,
): Promise<NextResponse | null> {
  const ip = requestIpAddress(request) ?? "unknown";
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
