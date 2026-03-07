import { NextResponse } from "next/server";

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

export function tooManyRequests(message: string, retryAfterSeconds = 60): NextResponse {
  const response = NextResponse.json({ error: message }, { status: 429 });
  response.headers.set("Retry-After", String(retryAfterSeconds));
  return response;
}

export function quotaExceeded(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 429 });
}
