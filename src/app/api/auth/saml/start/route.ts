import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { buildSamlStartUrl, isSamlSsoSupported } from "@/lib/stytch";

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(60)
  .regex(/^[a-z0-9-]+$/);

function redirectWithError(request: NextRequest, code: string): NextResponse {
  const url = new URL("/login", request.nextUrl.origin);
  url.searchParams.set("error", code);
  return NextResponse.redirect(url);
}

function callbackUrl(request: NextRequest): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  return `${appUrl.replace(/\/$/, "")}/api/auth/saml/callback`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isSamlSsoSupported()) {
    return redirectWithError(request, "saml_not_configured");
  }

  const parsedSlug = slugSchema.safeParse(request.nextUrl.searchParams.get("slug"));
  if (!parsedSlug.success) {
    return redirectWithError(request, "saml_workspace_not_found");
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
    return redirectWithError(request, "saml_workspace_not_found");
  }

  if (
    !workspace.samlEnabled ||
    !workspace.samlMetadataUrl ||
    !workspace.samlOrganizationId ||
    !workspace.samlConnectionId
  ) {
    return redirectWithError(request, "saml_workspace_not_ready");
  }

  try {
    const startUrl = buildSamlStartUrl({
      connectionId: workspace.samlConnectionId,
      loginRedirectUrl: callbackUrl(request),
      signupRedirectUrl: callbackUrl(request),
    });
    return NextResponse.redirect(startUrl);
  } catch {
    return redirectWithError(request, "saml_not_configured");
  }
}
