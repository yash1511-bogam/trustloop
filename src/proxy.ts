import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { slugFromSubdomain } from "@/lib/workspace-url";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-DNS-Prefetch-Control": "on",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://*.dodopayments.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-src 'self' https://challenges.cloudflare.com https://*.dodopayments.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
};

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // ── Internal portal gate ───────────────────────────────────────────────────
  // Kill switch: enterprise self-hosted instances never set INTERNAL_PORTAL_ENABLED
  if (pathname.startsWith("/_internal") || pathname.startsWith("/api/_internal")) {
    if (process.env.INTERNAL_PORTAL_ENABLED !== "true") {
      return new NextResponse(null, { status: 404 });
    }
    // Optional Tailscale IP check (disabled by default)
    if (process.env.INTERNAL_REQUIRE_TAILSCALE === "true") {
      const xff = request.headers.get("x-forwarded-for");
      const ip = xff ? xff.split(",")[0]?.trim() : request.headers.get("x-real-ip")?.trim();
      if (ip) {
        const parts = ip.split(".");
        if (parts.length === 4) {
          const n = parts.reduce((acc, o) => (acc << 8) + (Number(o) | 0), 0) >>> 0;
          // Tailscale CGNAT: 100.64.0.0/10 = 100.64.0.0 – 100.127.255.255
          if (n < 1681915904 || n > 1686110207) {
            return new NextResponse(null, { status: 404 });
          }
        } else {
          return new NextResponse(null, { status: 404 });
        }
      } else {
        return new NextResponse(null, { status: 404 });
      }
    }
  }

  // ── Existing proxy logic ───────────────────────────────────────────────────
  const host = request.headers.get("host") ?? request.headers.get("x-forwarded-host");
  const APP_HOST = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").hostname;
  const hostBase = host?.split(":")[0] ?? "";

  // Custom domain routing — if host is not the app domain, not localhost, and not a subdomain
  const subdomainSlug = slugFromSubdomain(host);
  if (
    hostBase &&
    hostBase !== APP_HOST &&
    hostBase !== "localhost" &&
    hostBase !== "127.0.0.1" &&
    !subdomainSlug &&
    request.nextUrl.pathname === "/"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/_custom-status";
    url.searchParams.set("domain", hostBase);
    return NextResponse.rewrite(url);
  }

  const response = NextResponse.next();

  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  if (subdomainSlug) {
    response.headers.set("x-workspace-slug", subdomainSlug);
  }

  // X-Request-ID on all API responses
  if (request.nextUrl.pathname.startsWith("/api")) {
    const requestId = request.headers.get("x-request-id") || randomUUID();
    response.headers.set("X-Request-ID", requestId);
  }

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.svg$|.*\\.png$|.*\\.mp4$).*)",
  ],
};
