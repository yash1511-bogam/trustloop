import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { slugFromSubdomain } from "@/lib/workspace-url";
import { SESSION_COOKIE_NAME, ACTIVE_SLUG_COOKIE_NAME } from "@/lib/constants";

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

const HOMEPAGE_MARKDOWN = `# TrustLoop — AI Incident Operations

TrustLoop is an incident operations platform for AI product teams. Detect incidents, triage with AI, coordinate responders, publish customer updates, and keep leadership informed.

## Features

- **Incident Intake** — Dashboards, support teams, Slack, and signed webhooks
- **AI Triage** — Workspace-scoped keys across OpenAI, Gemini, and Anthropic
- **Customer Updates** — Approval controls and full audit history
- **Async Automation** — SQS-backed reminders that keep incidents moving
- **Multi-Channel Publishing** — App, Slack, push, email, and public status pages
- **Plans & Billing** — Quotas, feature gates, and billing per workspace
- **Executive Reporting** — Exports and operational visibility

## API

- OpenAPI spec: [/api/docs](/api/docs)
- Documentation: [/docs](/docs)
- Health check: [/api/health](/api/health)

## Discovery

- API Catalog: [/.well-known/api-catalog](/.well-known/api-catalog)
- MCP Server Card: [/.well-known/mcp/server-card.json](/.well-known/mcp/server-card.json)
- A2A Agent Card: [/.well-known/agent-card.json](/.well-known/agent-card.json)
- Agent Skills: [/.well-known/agent-skills/index.json](/.well-known/agent-skills/index.json)

## Links

- [Login](/login)
- [Register](/register)
- [Documentation](/docs)
- [Changelog](/changelog)
- [Contact Sales](/contact-sales)
`;

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // ── Markdown content negotiation ───────────────────────────────────────────
  const accept = request.headers.get("accept") ?? "";
  if (pathname === "/" && accept.includes("text/markdown")) {
    const tokens = HOMEPAGE_MARKDOWN.split(/\s+/).length;
    return new NextResponse(HOMEPAGE_MARKDOWN, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "x-markdown-tokens": String(tokens),
      },
    });
  }

  // ── Internal portal gate ───────────────────────────────────────────────────
  // Kill switch: enterprise self-hosted instances never set INTERNAL_PORTAL_ENABLED
  if (pathname.startsWith("/internal-portal") || pathname.startsWith("/api/internal-portal")) {
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

  // Redirect authenticated users on subdomains away from public pages to dashboard
  if (subdomainSlug) {
    const isPublicPage = pathname === "/" || pathname === "/login" || pathname === "/register";
    if (isPublicPage && request.cookies.get(SESSION_COOKIE_NAME)?.value) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // Redirect to correct subdomain if URL slug doesn't match active workspace
    if (!pathname.startsWith("/api/") && request.cookies.get(SESSION_COOKIE_NAME)?.value) {
      const activeSlug = request.cookies.get(ACTIVE_SLUG_COOKIE_NAME)?.value;
      if (activeSlug && activeSlug !== subdomainSlug) {
        const domain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";
        const proto = domain.startsWith("localhost") ? "http" : "https";
        const url = new URL(`${proto}://${activeSlug}.${domain}${pathname}${request.nextUrl.search}`);
        return NextResponse.redirect(url);
      }
    }
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
