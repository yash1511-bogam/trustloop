import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { appOrigin } from "@/lib/app-url";
import { badRequest } from "@/lib/http";
import { buildOAuthStartUrl, isStubAuthEnabled, OAuthProvider, STUB_OAUTH_TOKEN_PREFIX } from "@/lib/stytch";
import { redisGet } from "@/lib/redis";

const DESKTOP_OAUTH_COOKIE = "trustloop_desktop_oauth";
const DESKTOP_OAUTH_NONCE_COOKIE = "trustloop_desktop_oauth_nonce";
const MAX_AGE = 10 * 60;

const providerSchema = z.enum(["google", "github"]);
const querySchema = z.object({
  intent: z.enum(["login", "register"]).optional(),
  workspaceName: z.string().min(2).max(80).optional(),
  nonce: z.string().min(16).max(64),
});

function callbackUrl(request: NextRequest): string {
  return `${appOrigin(request)}/api/auth/oauth/callback`;
}

function setCookie(
  response: NextResponse,
  context: {
    provider: OAuthProvider;
    intent: "login" | "register";
    workspaceName?: string;
    desktop: true;
    nonce: string;
  },
): void {
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set({
    name: DESKTOP_OAUTH_COOKIE,
    value: encodeURIComponent(JSON.stringify(context)),
    httpOnly: true, sameSite: "lax", secure, maxAge: MAX_AGE, path: "/",
  });
  response.cookies.set({
    name: DESKTOP_OAUTH_NONCE_COOKIE,
    value: context.nonce,
    httpOnly: true, sameSite: "lax", secure, maxAge: MAX_AGE, path: "/",
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
): Promise<NextResponse> {
  const routeParams = await params;
  const parsed = providerSchema.safeParse(routeParams.provider);
  if (!parsed.success) {
    return NextResponse.json({ error: "Unsupported provider." }, { status: 404 });
  }

  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const pq = querySchema.safeParse(query);
  if (!pq.success) return badRequest("Invalid parameters.");

  // Verify the nonce was created by the desktop app
  const nonceKey = `desktop:oauth-nonce:${pq.data.nonce}`;
  const stored = await redisGet(nonceKey);
  if (stored !== "1") {
    return NextResponse.json({ error: "Invalid or expired desktop session." }, { status: 403 });
  }

  const intent = pq.data.intent ?? "login";
  const nonce = randomBytes(16).toString("hex");
  const target = callbackUrl(request);

  if (isStubAuthEnabled()) {
    const stubUrl = `${target}?token=${STUB_OAUTH_TOKEN_PREFIX}${parsed.data}`;
    const response = NextResponse.redirect(stubUrl);
    setCookie(response, { provider: parsed.data, intent, workspaceName: pq.data.workspaceName?.trim(), desktop: true, nonce });
    return response;
  }

  try {
    const startUrl = buildOAuthStartUrl({
      provider: parsed.data,
      loginRedirectUrl: target,
      signupRedirectUrl: target,
    });
    const response = NextResponse.redirect(startUrl);
    setCookie(response, { provider: parsed.data, intent, workspaceName: pq.data.workspaceName?.trim(), desktop: true, nonce });
    return response;
  } catch {
    return NextResponse.json({ error: "OAuth not configured." }, { status: 500 });
  }
}
