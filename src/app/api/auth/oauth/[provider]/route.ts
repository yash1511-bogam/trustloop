import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { appOrigin, appUrl } from "@/lib/app-url";
import { badRequest } from "@/lib/http";
import { buildOAuthStartUrl, isStubAuthEnabled, OAuthProvider, STUB_OAUTH_TOKEN_PREFIX } from "@/lib/stytch";
import { verifyTurnstileToken } from "@/lib/turnstile";

const OAUTH_CONTEXT_COOKIE_NAME = "trustloop_oauth_context";
const OAUTH_NONCE_COOKIE_NAME = "trustloop_oauth_nonce";
const OAUTH_CONTEXT_MAX_AGE_SECONDS = 10 * 60;

const providerSchema = z.enum(["google", "github"]);
const querySchema = z.object({
  intent: z.enum(["login", "register"]).optional(),
  workspaceName: z.string().min(2).max(80).optional(),
  inviteToken: z.string().uuid().optional(),
  inviteCode: z.string().min(1).max(40).optional(),
  turnstileToken: z.string().min(1).optional(),
});

function callbackUrl(input: {
  request: NextRequest;
}): string {
  return `${appOrigin(input.request)}/api/auth/oauth/callback`;
}

function setOAuthContextCookie(
  response: NextResponse,
  context: {
    provider: OAuthProvider;
    intent: "login" | "register";
    workspaceName?: string;
    inviteToken?: string;
    inviteCode?: string;
    nonce: string;
  },
): void {
  response.cookies.set({
    name: OAUTH_CONTEXT_COOKIE_NAME,
    value: encodeURIComponent(JSON.stringify(context)),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: OAUTH_CONTEXT_MAX_AGE_SECONDS,
    path: "/",
  });
  // Store nonce separately so callback can verify the flow was initiated by this browser
  response.cookies.set({
    name: OAUTH_NONCE_COOKIE_NAME,
    value: context.nonce,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: OAUTH_CONTEXT_MAX_AGE_SECONDS,
    path: "/",
  });
}

function clearOAuthContextCookie(response: NextResponse): void {
  response.cookies.set({
    name: OAUTH_CONTEXT_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
    path: "/",
  });
}

function redirectWithError(
  request: NextRequest,
  intent: "login" | "register",
  code: string,
): NextResponse {
  const url = appUrl(intent === "register" ? "/register" : "/login", request);
  url.searchParams.set("error", code);
  const response = NextResponse.redirect(url);
  clearOAuthContextCookie(response);
  return response;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
): Promise<NextResponse> {
  const routeParams = await params;
  const parsedProvider = providerSchema.safeParse(routeParams.provider);
  if (!parsedProvider.success) {
    return NextResponse.json({ error: "Unsupported OAuth provider." }, { status: 404 });
  }

  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsedQuery = querySchema.safeParse(query);
  if (!parsedQuery.success) {
    return badRequest("Invalid OAuth start parameters.");
  }

  const intent = parsedQuery.data.intent ?? "login";

  if (isStubAuthEnabled()) {
    const target = callbackUrl({ request });
    const stubUrl = `${target}?token=${STUB_OAUTH_TOKEN_PREFIX}${parsedProvider.data}`;
    const response = NextResponse.redirect(stubUrl);
    setOAuthContextCookie(response, {
      provider: parsedProvider.data,
      intent,
      workspaceName: parsedQuery.data.workspaceName?.trim(),
      inviteToken: parsedQuery.data.inviteToken,
      inviteCode: parsedQuery.data.inviteCode?.trim(),
      nonce: randomBytes(16).toString("hex"),
    });
    return response;
  }

  const turnstile = await verifyTurnstileToken({
    request,
    token: parsedQuery.data.turnstileToken,
  });
  if (!turnstile.success) {
    return redirectWithError(request, intent, "security_verification_failed");
  }
  const target = callbackUrl({
    request,
  });

  try {
    const startUrl = buildOAuthStartUrl({
      provider: parsedProvider.data,
      loginRedirectUrl: target,
      signupRedirectUrl: target,
    });
    const response = NextResponse.redirect(startUrl);
    setOAuthContextCookie(response, {
      provider: parsedProvider.data,
      intent,
      workspaceName: parsedQuery.data.workspaceName?.trim(),
      inviteToken: parsedQuery.data.inviteToken,
      inviteCode: parsedQuery.data.inviteCode?.trim(),
      nonce: randomBytes(16).toString("hex"),
    });
    return response;
  } catch {
    const fallback =
      intent === "register"
        ? "/register?error=oauth_not_configured"
        : "/login?error=oauth_not_configured";
    const response = NextResponse.redirect(appUrl(fallback, request));
    clearOAuthContextCookie(response);
    return response;
  }
}
