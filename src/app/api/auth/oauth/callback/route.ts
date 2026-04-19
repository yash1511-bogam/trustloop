import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { AiProvider, Role, WorkflowType } from "@prisma/client";
import { z } from "zod";
import { appUrl } from "@/lib/app-url";
import { recordAuditLog } from "@/lib/audit";
import { quotasForPlan } from "@/lib/billing-plan";
import { setSessionCookie, setActiveSlugCookie } from "@/lib/cookies";
import { sendGettingStartedGuideEmail, scheduleWelcomeEmail, upsertEmailSubscription } from "@/lib/email";
import { log } from "@/lib/logger";
import { createSampleIncidentsForWorkspace } from "@/lib/onboarding-demo";
import { prisma } from "@/lib/prisma";
import { redisSetJson } from "@/lib/redis";
import { workspaceUrl } from "@/lib/workspace-url";
import { authenticateOAuthToken } from "@/lib/stytch";
import { createWorkspaceWithExactSlug, ensureWorkspaceSlug, slugBaseFromName } from "@/lib/workspace-slug";
import { ensureWorkspaceMembership } from "@/lib/workspace-membership";

const OAUTH_CONTEXT_COOKIE_NAME = "trustloop_oauth_context";
const OAUTH_NONCE_COOKIE_NAME = "trustloop_oauth_nonce";
const DESKTOP_OAUTH_COOKIE = "trustloop_desktop_oauth";
const DESKTOP_OAUTH_NONCE_COOKIE = "trustloop_desktop_oauth_nonce";

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
  inviteCode: z.string().min(1).max(40).optional(),
  desktop: z.boolean().optional(),
  nonce: z.string().min(16),
});

function buildRedirect(
  request: NextRequest,
  path: string,
  params?: Record<string, string | undefined>,
): NextResponse {
  const url = appUrl(path, request);
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
  const secure = process.env.NODE_ENV === "production";
  for (const name of [OAUTH_CONTEXT_COOKIE_NAME, OAUTH_NONCE_COOKIE_NAME, DESKTOP_OAUTH_COOKIE, DESKTOP_OAUTH_NONCE_COOKIE]) {
    response.cookies.set({ name, value: "", httpOnly: true, sameSite: "lax", secure, expires: new Date(0), path: "/" });
  }
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

async function buildDesktopRedirect(
  request: NextRequest,
  authResult: { sessionToken: string; expiresAt: Date; stytchUserId: string },
): Promise<NextResponse> {
  // Store session in Redis with a one-time exchange key
  const exchangeKey = crypto.randomUUID();
  await redisSetJson(`desktop:oauth-exchange:${exchangeKey}`, {
    sessionToken: authResult.sessionToken,
    expiresAt: authResult.expiresAt.toISOString(),
    stytchUserId: authResult.stytchUserId,
  }, 5 * 60);
  const url = appUrl("/desktop-oauth-callback", request);
  url.searchParams.set("key", exchangeKey);
  const response = NextResponse.redirect(url);
  clearOAuthContextCookie(response);
  return response;
}

function readOAuthContextCookie(request: NextRequest): z.infer<typeof oauthContextSchema> | null {
  // Check standard web cookie first, then desktop cookie
  const raw = request.cookies.get(OAUTH_CONTEXT_COOKIE_NAME)?.value
    ?? request.cookies.get(DESKTOP_OAUTH_COOKIE)?.value;
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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = callbackSchema.safeParse(searchParams);
  if (!parsed.success) {
    return buildRedirectWithClear(request, "/login", { error: "oauth_invalid_callback" });
  }

  const oauthContext = readOAuthContextCookie(request);

  // Verify the nonce cookie matches the nonce in the context cookie (CSRF protection)
  if (!oauthContext) {
    // No context cookie means the flow wasn't initiated from this browser
    return buildRedirectWithClear(request, "/login", { error: "oauth_state_missing" });
  }

  const nonceCookie = request.cookies.get(OAUTH_NONCE_COOKIE_NAME)?.value
    ?? request.cookies.get(DESKTOP_OAUTH_NONCE_COOKIE)?.value;
  if (!nonceCookie) {
    return buildRedirectWithClear(request, "/login", { error: "oauth_state_mismatch" });
  }

  const a = Buffer.from(oauthContext.nonce, "utf8");
  const b = Buffer.from(nonceCookie, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return buildRedirectWithClear(request, "/login", { error: "oauth_state_mismatch" });
  }

  const intent = oauthContext?.intent ?? parsed.data.intent ?? "login";
  const isDesktop = oauthContext?.desktop === true;
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

    if (existing && !inviteToken) {
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

      recordAuditLog({ workspaceId: existing.workspace.id, actorUserId: existing.id, action: "auth.oauth_login", targetType: "user", targetId: existing.id, summary: `OAuth sign-in for ${email}` }).catch(() => {});

      const slug = existing.workspace.slug ?? (await ensureWorkspaceSlug(prisma, existing.workspace.id, existing.workspace.name));
      if (isDesktop) return buildDesktopRedirect(request, authResult);
      const dashboardUrl = slug
        ? workspaceUrl("/dashboard", slug, existing.role)
        : appUrl("/dashboard", request).toString();
      const response = NextResponse.redirect(dashboardUrl);
      setSessionCookie(response, authResult.sessionToken, authResult.expiresAt);
      if (slug) setActiveSlugCookie(response, slug);
      clearOAuthContextCookie(response);
      return response;
    }

    if (intent !== "register" && !inviteToken) {
      return buildRedirectWithClear(request, "/register", {
        email,
        error: "oauth_no_workspace_account",
      });
    }

    // Validate invite code for new registrations (not workspace invites)
    // Desktop app users are exempt from invite code requirement
    const inviteCodeValue = oauthContext?.inviteCode;
    if (!inviteToken && !isDesktop) {
      if (!inviteCodeValue) {
        return buildRedirectWithClear(request, "/register", {
          email,
          error: "invite_code_required",
        });
      }
      const inviteCodeRecord = await prisma.inviteCode.findUnique({
        where: { code: inviteCodeValue },
      });
      if (!inviteCodeRecord || inviteCodeRecord.used || (inviteCodeRecord.email && inviteCodeRecord.email.toLowerCase() !== email)) {
        return buildRedirectWithClear(request, "/register", {
          email,
          error: "invite_code_invalid",
        });
      }
    }

    // For new registrations without a workspace invite
    if (!inviteToken) {
      // If company name was provided on the register form, create workspace directly
      if (workspaceName) {
        // Check slug uniqueness before creating
        const slug = slugBaseFromName(workspaceName);
        const slugTaken = await prisma.workspace.findUnique({ where: { slug }, select: { id: true } });
        if (slugTaken) {
          return buildRedirectWithClear(request, "/register", {
            email,
            error: "company_name_taken",
          });
        }

        const starterQuota = quotasForPlan("starter");
        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);

        const created = await prisma.$transaction(async (tx) => {
          const workspace = await createWorkspaceWithExactSlug(tx, workspaceName, { planTier: "starter" });

          const user = existing
            ? await tx.user.update({
                where: { id: existing.id },
                data: { workspaceId: workspace.id, role: Role.OWNER, stytchUserId: existing.stytchUserId !== authResult.stytchUserId ? authResult.stytchUserId : undefined },
              })
            : await tx.user.create({
                data: { workspaceId: workspace.id, email, name: authResult.name?.trim() || "Workspace Owner", role: Role.OWNER, stytchUserId: authResult.stytchUserId },
              });

          await tx.workflowSetting.createMany({
            data: [
              { workspaceId: workspace.id, workflowType: WorkflowType.INCIDENT_TRIAGE, provider: AiProvider.OPENAI, model: "gpt-4o-mini" },
              { workspaceId: workspace.id, workflowType: WorkflowType.CUSTOMER_UPDATE, provider: AiProvider.OPENAI, model: "gpt-4o-mini" },
            ],
          });
          await tx.workspaceQuota.create({ data: { workspaceId: workspace.id, ...starterQuota } });
          await tx.workspaceDailyUsage.upsert({
            where: { workspaceId_usageDate: { workspaceId: workspace.id, usageDate: startOfDay } },
            create: { workspaceId: workspace.id, usageDate: startOfDay },
            update: {},
          });
          await ensureWorkspaceMembership(tx, { workspaceId: workspace.id, userId: user.id, role: Role.OWNER });
          await createSampleIncidentsForWorkspace(tx, { workspaceId: workspace.id, ownerUserId: user.id });

          return { user, workspace };
        });

        if (inviteCodeValue) {
          await prisma.inviteCode.update({ where: { code: inviteCodeValue }, data: { used: true, usedAt: new Date(), usedByUserId: created.user.id } });
        }

        upsertEmailSubscription({ email: created.user.email, name: created.user.name, userId: created.user.id }).catch(() => {});
        recordAuditLog({ workspaceId: created.workspace.id, actorUserId: created.user.id, action: "auth.oauth_register", targetType: "user", targetId: created.user.id, summary: `OAuth registration for ${created.user.email}` }).catch(() => {});
        scheduleWelcomeEmail({ workspaceId: created.workspace.id, toEmail: created.user.email, workspaceName: created.workspace.name, userName: created.user.name });
        sendGettingStartedGuideEmail({ workspaceId: created.workspace.id, toEmail: created.user.email, workspaceName: created.workspace.name, userName: created.user.name }).catch(() => {});

        const dashUrl = created.workspace.slug ? workspaceUrl("/dashboard", created.workspace.slug, created.user.role) : appUrl("/dashboard", request).toString();
        if (isDesktop) return buildDesktopRedirect(request, authResult);
        const response = NextResponse.redirect(dashUrl);
        setSessionCookie(response, authResult.sessionToken, authResult.expiresAt);
        if (created.workspace.slug) setActiveSlugCookie(response, created.workspace.slug);
        clearOAuthContextCookie(response);
        return response;
      }

      // Fallback: no company name provided, redirect to collect it
      const sessionKey = `auth:oauth-pending:${crypto.randomUUID()}`;
      await redisSetJson(sessionKey, {
        sessionToken: authResult.sessionToken,
        expiresAt: authResult.expiresAt.toISOString(),
        stytchUserId: authResult.stytchUserId,
        email,
        name: authResult.name?.trim() || "",
        inviteCode: inviteCodeValue,
        existingUserId: existing?.id,
      }, 15 * 60);
      const key = sessionKey.replace("auth:oauth-pending:", "");
      return buildRedirectWithClear(request, "/register/complete", { session: key });
    }

    const created = await prisma.$transaction(async (tx) => {
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

      const user = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: {
              workspaceId: invite.workspaceId,
              role: invite.role,
              stytchUserId:
                existing.stytchUserId !== authResult.stytchUserId
                  ? authResult.stytchUserId
                  : undefined,
            },
          })
        : await tx.user.create({
            data: {
              workspaceId: invite.workspaceId,
              email,
              name: authResult.name?.trim() || "Team Member",
              role: invite.role,
              stytchUserId: authResult.stytchUserId,
            },
          });

      await ensureWorkspaceMembership(tx, {
        workspaceId: invite.workspaceId,
        userId: user.id,
        role: invite.role,
      });

      await tx.workspaceInvite.update({
        where: { id: invite.id },
        data: { usedAt: new Date() },
      });

      await ensureWorkspaceSlug(tx, invite.workspace.id, invite.workspace.name);

      return { user, workspace: invite.workspace };
    });

    recordAuditLog({ workspaceId: created.workspace.id, actorUserId: created.user.id, action: "auth.oauth_register", targetType: "user", targetId: created.user.id, summary: `OAuth registration for ${created.user.email}` }).catch(() => {});

    scheduleWelcomeEmail({
      workspaceId: created.workspace.id,
      toEmail: created.user.email,
      workspaceName: created.workspace.name,
      userName: created.user.name,
    });
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

    const newSlug = created.workspace.slug;
    const newDashUrl = newSlug
      ? workspaceUrl("/dashboard", newSlug, created.user.role)
      : appUrl("/dashboard", request).toString();
    if (isDesktop) return buildDesktopRedirect(request, authResult);
    const response = NextResponse.redirect(newDashUrl);
    setSessionCookie(response, authResult.sessionToken, authResult.expiresAt);
    if (newSlug) setActiveSlugCookie(response, newSlug);
    clearOAuthContextCookie(response);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "oauth_failed";
    const stack = error instanceof Error ? error.stack : undefined;
    log.auth.error("OAuth callback failed", {
      intent,
      inviteToken: inviteToken ?? null,
      error: message,
      stack,
      statusCode: (error as { status_code?: number }).status_code,
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
