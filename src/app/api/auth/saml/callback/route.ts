import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { appUrl } from "@/lib/app-url";
import { setSessionCookie } from "@/lib/cookies";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { authenticateSamlToken, isSamlSsoSupported } from "@/lib/stytch";
import { ensureWorkspaceSlug } from "@/lib/workspace-slug";

const SAML_CONTEXT_COOKIE_NAME = "trustloop_saml_context";

const samlContextSchema = z.object({
  intent: z.enum(["login", "register"]).optional(),
});

const callbackSchema = z.object({
  token: z.string().min(8),
});

function buildRedirectPath(intent: "login" | "register"): string {
  return intent === "register" ? "/register" : "/login";
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

function readSamlContextCookie(request: NextRequest): z.infer<typeof samlContextSchema> | null {
  const raw = request.cookies.get(SAML_CONTEXT_COOKIE_NAME)?.value;
  if (!raw) {
    return null;
  }

  try {
    const parsed = samlContextSchema.safeParse(JSON.parse(decodeURIComponent(raw)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function redirectWithError(
  request: NextRequest,
  code: string,
  intent: "login" | "register" = "login",
): NextResponse {
  const url = appUrl(buildRedirectPath(intent), request);
  url.searchParams.set("error", code);
  const response = NextResponse.redirect(url);
  clearSamlContextCookie(response);
  return response;
}

function fallbackName(email: string): string {
  const local = email.split("@")[0]?.trim() || "Team Member";
  return local.slice(0, 80);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const samlContext = readSamlContextCookie(request);
  const intent = samlContext?.intent ?? "login";

  if (!isSamlSsoSupported()) {
    return redirectWithError(request, "saml_not_configured", intent);
  }

  const parsed = callbackSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (!parsed.success) {
    return redirectWithError(request, "saml_callback_invalid", intent);
  }

  try {
    const authResult = await authenticateSamlToken(parsed.data.token);
    const normalizedEmail = authResult.email?.toLowerCase().trim() ?? null;

    if (!normalizedEmail) {
      return redirectWithError(request, "saml_email_missing", intent);
    }

    const workspaceLookupConditions: Array<{
      samlOrganizationId?: string;
      samlConnectionId?: string;
    }> = [{ samlOrganizationId: authResult.organizationId }];
    if (authResult.connectionId) {
      workspaceLookupConditions.push({ samlConnectionId: authResult.connectionId });
    }

    const workspace = await prisma.workspace.findFirst({
      where: {
        samlEnabled: true,
        OR: workspaceLookupConditions,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!workspace) {
      return redirectWithError(request, "saml_workspace_not_ready", intent);
    }

    const existing = await prisma.user.findFirst({
      where: {
        workspaceId: workspace.id,
        OR: [{ stytchUserId: authResult.stytchUserId }, { email: normalizedEmail }],
      },
      select: {
        id: true,
        email: true,
        stytchUserId: true,
      },
    });

    let userId = existing?.id ?? null;

    if (existing) {
      if (existing.stytchUserId !== authResult.stytchUserId) {
        try {
          await prisma.user.update({
            where: { id: existing.id },
            data: {
              stytchUserId: authResult.stytchUserId,
            },
          });
        } catch (error) {
          log.auth.warn("Failed to backfill Stytch member ID during SAML callback", {
            workspaceId: workspace.id,
            userId: existing.id,
            email: normalizedEmail,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    } else {
      const invite = await prisma.workspaceInvite.findFirst({
        where: {
          workspaceId: workspace.id,
          email: normalizedEmail,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: {
          id: true,
          role: true,
        },
      });

      if (!invite) {
        return redirectWithError(request, "saml_invite_required", intent);
      }

      const created = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            workspaceId: workspace.id,
            email: normalizedEmail,
            name: authResult.name?.trim() || fallbackName(normalizedEmail),
            role: invite.role,
            stytchUserId: authResult.stytchUserId,
          },
          select: {
            id: true,
          },
        });

        await tx.workspaceInvite.update({
          where: { id: invite.id },
          data: {
            usedAt: new Date(),
          },
        });

        return user;
      });

      userId = created.id;
    }

    await ensureWorkspaceSlug(prisma, workspace.id, workspace.name);

    const response = NextResponse.redirect(appUrl("/dashboard", request));
    setSessionCookie(response, authResult.sessionToken, authResult.expiresAt);
    clearSamlContextCookie(response);

    log.auth.info("SAML sign-in completed", {
      workspaceId: workspace.id,
      userId,
      organizationId: authResult.organizationId,
      connectionId: authResult.connectionId,
    });

    return response;
  } catch (error) {
    log.auth.error("SAML callback failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return redirectWithError(request, "saml_auth_failed", intent);
  }
}
