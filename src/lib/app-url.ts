import { NextRequest } from "next/server";

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/$/, "");
}

export function appOrigin(request?: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured?.trim()) {
    return normalizeBaseUrl(configured);
  }

  if (!request) {
    return "http://localhost:3000";
  }

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (forwardedHost) {
    const forwardedProto =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
      request.nextUrl.protocol.replace(/:$/, "") ||
      "https";
    return `${forwardedProto}://${forwardedHost}`;
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
