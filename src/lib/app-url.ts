import { NextRequest } from "next/server";

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/$/, "");
}

export function appOrigin(request?: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured?.trim()) {
    return normalizeBaseUrl(configured);
  }

  // In production, always require an explicit origin
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_APP_URL must be set in production.");
  }

  if (!request) {
    return "http://localhost:3000";
  }

  const host = request.headers.get("host")?.trim();
  if (host) {
    return `${request.nextUrl.protocol}//${host}`.replace(/\/$/, "");
  }

  return normalizeBaseUrl(request.nextUrl.origin);
}

export function appUrl(path: string, request?: NextRequest): URL {
  return new URL(path, appOrigin(request));
}
