import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { setSessionCookie } from "@/lib/cookies";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { authenticateSamlToken, isSamlSsoSupported } from "@/lib/stytch";

const callbackSchema = z.object({
  token: z.string().min(8),
});

function redirectWithError(request: NextRequest, code: string): NextResponse {
  const url = new URL("/login", request.nextUrl.origin);
  url.searchParams.set("error", code);
  return NextResponse.redirect(url);
}

function fallbackName(email: string): string {
  const local = email.split("@")[0]?.trim() || "Team Member";
  return local.slice(0, 80);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isSamlSsoSupported()) {
    return redirectWithError(request, "saml_not_configured");
  }

  const parsed = callbackSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (!parsed.success) {
    return redirectWithError(request, "saml_callback_invalid");
  }

  try {
    const authResult = await authenticateSamlToken(parsed.data.token);
    const normalizedEmail = authResult.email?.toLowerCase().trim() ?? null;

    if (!normalizedEmail) {
      return redirectWithError(request, "saml_email_missing");
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
      return redirectWithError(request, "saml_workspace_not_ready");
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
        return redirectWithError(request, "saml_invite_required");
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

    const response = NextResponse.redirect(new URL("/dashboard", request.nextUrl.origin));
    setSessionCookie(response, authResult.sessionToken, authResult.expiresAt);

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
    return redirectWithError(request, "saml_auth_failed");
  }
}
