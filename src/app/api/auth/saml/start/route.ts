import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { appOrigin, appUrl } from "@/lib/app-url";
import { prisma } from "@/lib/prisma";
import { buildSamlStartUrl, isSamlSsoSupported } from "@/lib/stytch";

const SAML_CONTEXT_COOKIE_NAME = "trustloop_saml_context";
const SAML_CONTEXT_MAX_AGE_SECONDS = 10 * 60;

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(60)
  .regex(/^[a-z0-9-]+$/);

const intentSchema = z.enum(["login", "register"]);

function redirectPath(intent: "login" | "register"): string {
  return intent === "register" ? "/register" : "/login";
}

function redirectWithError(
  request: NextRequest,
  code: string,
  intent: "login" | "register" = "login",
): NextResponse {
  const url = appUrl(redirectPath(intent), request);
  url.searchParams.set("error", code);
  const response = NextResponse.redirect(url);
  clearSamlContextCookie(response);
  return response;
}

function setSamlContextCookie(
  response: NextResponse,
  context: {
    intent: "login" | "register";
  },
): void {
  response.cookies.set({
    name: SAML_CONTEXT_COOKIE_NAME,
    value: encodeURIComponent(JSON.stringify(context)),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SAML_CONTEXT_MAX_AGE_SECONDS,
    path: "/",
  });
}

function clearSamlContextCookie(response: NextResponse): void {
  response.cookies.set({
    name: SAML_CONTEXT_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
    path: "/",
  });
}

function callbackUrl(request: NextRequest): string {
  return `${appOrigin(request)}/api/auth/saml/callback`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const parsedIntent = intentSchema.safeParse(request.nextUrl.searchParams.get("intent"));
  const intent = parsedIntent.success ? parsedIntent.data : "login";

  if (!isSamlSsoSupported()) {
    return redirectWithError(request, "saml_not_configured", intent);
  }

  const parsedSlug = slugSchema.safeParse(request.nextUrl.searchParams.get("slug"));
  if (!parsedSlug.success) {
    return redirectWithError(request, "saml_workspace_not_found", intent);
  }

  const workspace = await prisma.workspace.findUnique({
    where: { slug: parsedSlug.data },
    select: {
      id: true,
      samlEnabled: true,
      samlMetadataUrl: true,
      samlOrganizationId: true,
      samlConnectionId: true,
    },
  });

  if (!workspace) {
    return redirectWithError(request, "saml_workspace_not_found", intent);
  }

  if (
    !workspace.samlEnabled ||
    !workspace.samlMetadataUrl ||
    !workspace.samlOrganizationId ||
    !workspace.samlConnectionId
  ) {
    return redirectWithError(request, "saml_workspace_not_ready", intent);
  }

  try {
    const startUrl = buildSamlStartUrl({
      connectionId: workspace.samlConnectionId,
      loginRedirectUrl: callbackUrl(request),
      signupRedirectUrl: callbackUrl(request),
    });
    const response = NextResponse.redirect(startUrl);
    setSamlContextCookie(response, { intent });
    return response;
  } catch {
    return redirectWithError(request, "saml_not_configured", intent);
  }
}
