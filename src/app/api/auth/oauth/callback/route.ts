import { NextRequest, NextResponse } from "next/server";
import { AiProvider, Role, WorkflowType } from "@prisma/client";
import { z } from "zod";
import { setSessionCookie } from "@/lib/cookies";
import { sendGettingStartedGuideEmail, sendWelcomeEmail } from "@/lib/email";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { authenticateOAuthToken } from "@/lib/stytch";
import { createWorkspaceWithGeneratedSlug, ensureWorkspaceSlug } from "@/lib/workspace-slug";

const OAUTH_CONTEXT_COOKIE_NAME = "trustloop_oauth_context";

const callbackSchema = z.object({
  token: z.string().min(8),
  provider: z.enum(["google", "github"]).optional(),
  intent: z.enum(["login", "register"]).optional(),
  workspaceName: z.string().min(2).max(80).optional(),
  inviteToken: z.string().uuid().optional(),
});

const oauthContextSchema = z.object({
  provider: z.enum(["google", "github"]).optional(),
  intent: z.enum(["login", "register"]).optional(),
  workspaceName: z.string().min(2).max(80).optional(),
  inviteToken: z.string().uuid().optional(),
});

function startOfUtcDay(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function buildRedirect(
  request: NextRequest,
  path: string,
  params?: Record<string, string | undefined>,
): NextResponse {
  const url = new URL(path, request.nextUrl.origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }
  }
  return NextResponse.redirect(url);
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

function buildRedirectWithClear(
  request: NextRequest,
  path: string,
  params?: Record<string, string | undefined>,
): NextResponse {
  const response = buildRedirect(request, path, params);
  clearOAuthContextCookie(response);
  return response;
}

function readOAuthContextCookie(request: NextRequest): z.infer<typeof oauthContextSchema> | null {
  const raw = request.cookies.get(OAUTH_CONTEXT_COOKIE_NAME)?.value;
  if (!raw) {
    return null;
  }

  try {
    const parsed = oauthContextSchema.safeParse(JSON.parse(decodeURIComponent(raw)));
    if (!parsed.success) {
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function defaultWorkspaceName(name: string | null, email: string): string {
  if (name?.trim()) {
    return `${name.trim().slice(0, 48)} Workspace`;
  }
  const local = email.split("@")[0] ?? "Team";
  return `${local.slice(0, 40)} Workspace`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = callbackSchema.safeParse(searchParams);
  if (!parsed.success) {
    return buildRedirectWithClear(request, "/login", { error: "oauth_invalid_callback" });
  }

  const oauthContext = readOAuthContextCookie(request);
  const intent = oauthContext?.intent ?? parsed.data.intent ?? "login";
  const inviteToken = oauthContext?.inviteToken ?? parsed.data.inviteToken;
  const workspaceName = oauthContext?.workspaceName ?? parsed.data.workspaceName;

  try {
    const authResult = await authenticateOAuthToken(parsed.data.token, {
      intent,
      organizationName: workspaceName,
    });
    if (!authResult.email) {
      const fallbackPath = intent === "register" ? "/register" : "/login";
      return buildRedirectWithClear(request, fallbackPath, {
        error: "oauth_email_missing",
      });
    }

    const email = authResult.email.toLowerCase().trim();

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ stytchUserId: authResult.stytchUserId }, { email }],
      },
      include: {
        workspace: true,
      },
    });

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
          log.auth.warn("Failed to backfill Stytch user ID during OAuth callback", {
            userId: existing.id,
            intent,
            email,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      await ensureWorkspaceSlug(prisma, existing.workspace.id, existing.workspace.name);

      const response = buildRedirect(request, "/dashboard");
      setSessionCookie(response, authResult.sessionToken, authResult.expiresAt);
      clearOAuthContextCookie(response);
      return response;
    }

    if (intent !== "register") {
      return buildRedirectWithClear(request, "/register", {
        email,
        error: "oauth_no_workspace_account",
      });
    }

    const created = await prisma.$transaction(async (tx) => {
      if (inviteToken) {
        const invite = await tx.workspaceInvite.findFirst({
          where: {
            token: inviteToken,
            usedAt: null,
            expiresAt: { gt: new Date() },
          },
          include: {
            workspace: true,
          },
        });

        if (!invite) {
          throw new Error("invite_invalid");
        }
        if (invite.email.toLowerCase() !== email) {
          throw new Error("invite_email_mismatch");
        }

        const user = await tx.user.create({
          data: {
            workspaceId: invite.workspaceId,
            email,
            name: authResult.name?.trim() || "Team Member",
            role: invite.role,
            stytchUserId: authResult.stytchUserId,
          },
        });

        await tx.workspaceInvite.update({
          where: {
            id: invite.id,
          },
          data: {
            usedAt: new Date(),
          },
        });

        await ensureWorkspaceSlug(tx, invite.workspace.id, invite.workspace.name);

        return { user, workspace: invite.workspace };
      }

      const workspace = await createWorkspaceWithGeneratedSlug(
        tx,
        workspaceName?.trim() || defaultWorkspaceName(authResult.name, email),
      );

      const user = await tx.user.create({
        data: {
          workspaceId: workspace.id,
          email,
          name: authResult.name?.trim() || "Workspace Owner",
          role: Role.OWNER,
          stytchUserId: authResult.stytchUserId,
        },
      });

      await tx.workflowSetting.createMany({
        data: [
          {
            workspaceId: workspace.id,
            workflowType: WorkflowType.INCIDENT_TRIAGE,
            provider: AiProvider.OPENAI,
            model: "gpt-4o-mini",
          },
          {
            workspaceId: workspace.id,
            workflowType: WorkflowType.CUSTOMER_UPDATE,
            provider: AiProvider.OPENAI,
            model: "gpt-4o-mini",
          },
        ],
      });

      await tx.workspaceQuota.create({
        data: {
          workspaceId: workspace.id,
        },
      });

      await tx.workspaceDailyUsage.upsert({
        where: {
          workspaceId_usageDate: {
            workspaceId: workspace.id,
            usageDate: startOfUtcDay(),
          },
        },
        create: {
          workspaceId: workspace.id,
          usageDate: startOfUtcDay(),
        },
        update: {},
      });

      return { user, workspace };
    });

    try {
      await sendWelcomeEmail({
        workspaceId: created.workspace.id,
        toEmail: created.user.email,
        workspaceName: created.workspace.name,
        userName: created.user.name,
      });
    } catch (error) {
      log.auth.error("Failed to send OAuth welcome email", {
        workspaceId: created.workspace.id,
        toEmail: created.user.email,
        intent,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    try {
      await sendGettingStartedGuideEmail({
        workspaceId: created.workspace.id,
        toEmail: created.user.email,
        workspaceName: created.workspace.name,
        userName: created.user.name,
      });
    } catch (error) {
      log.auth.error("Failed to send OAuth getting started email", {
        workspaceId: created.workspace.id,
        toEmail: created.user.email,
        intent,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const response = buildRedirect(request, "/dashboard");
    setSessionCookie(response, authResult.sessionToken, authResult.expiresAt);
    clearOAuthContextCookie(response);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "oauth_failed";
    log.auth.error("OAuth callback failed", {
      intent,
      inviteToken: inviteToken ?? null,
      error: message,
    });
    const errorCode =
      message === "invite_invalid" ||
      message === "invite_email_mismatch" ||
      message === "oauth_no_discovered_organization" ||
      message === "oauth_mfa_required"
        ? message
        : "oauth_failed";
    const fallbackPath = intent === "register" ? "/register" : "/login";
    return buildRedirectWithClear(request, fallbackPath, {
      error: errorCode,
    });
  }
}
