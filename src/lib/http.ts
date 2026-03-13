import { NextResponse } from "next/server";

export type RateLimitHeaderInput = {
  limit: number;
  remaining: number;
  resetAtUnix: number;
};

export function applyRateLimitHeaders(
  response: NextResponse,
  input: RateLimitHeaderInput,
): NextResponse {
  response.headers.set("X-RateLimit-Limit", String(input.limit));
  response.headers.set("X-RateLimit-Remaining", String(Math.max(0, input.remaining)));
  response.headers.set("X-RateLimit-Reset", String(input.resetAtUnix));
  return response;
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden(): NextResponse {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export function notFound(message = "Not found"): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function tooManyRequests(
  message: string,
  retryAfterSeconds = 60,
  details?: Record<string, unknown>,
  rateLimit?: RateLimitHeaderInput,
): NextResponse {
  const response = NextResponse.json(
    {
      error: message,
      retryAfterSeconds,
      ...(details ?? {}),
    },
    { status: 429 },
  );
  response.headers.set("Retry-After", String(retryAfterSeconds));
  return rateLimit ? applyRateLimitHeaders(response, rateLimit) : response;
}

export function quotaExceeded(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 429 });
}
