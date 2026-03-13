import { NextRequest, NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { hasRole, invalidateSessionAuthCache } from "@/lib/auth";
import { recordAuditForAccess } from "@/lib/audit";
import { requireApiAuthAndRateLimit, withRateLimitHeaders } from "@/lib/api-guard";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { badRequest, forbidden } from "@/lib/http";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { slackInstallUrl } from "@/lib/slack";
import { isFeatureAllowed, featureGateError } from "@/lib/feature-gate";
import {
  authenticateB2BMemberSession,
  isSamlSsoSupported,
  syncWorkspaceSamlConnection,
} from "@/lib/stytch";
import { deleteWorkspaceAndRehomeUsers } from "@/lib/workspace-admin";

const statusSlugPattern = /^[a-z0-9-]{3,60}$/;

const updateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  slug: z
    .string()
    .trim()
    .max(60)
    .optional()
    .nullable(),
  statusPageEnabled: z.boolean().optional(),
  complianceMode: z.boolean().optional(),
  slackChannelId: z
    .string()
    .trim()
    .max(60)
    .optional()
    .nullable(),
  samlEnabled: z.boolean().optional(),
  samlMetadataUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable(),
  customerUpdateApprovalsRequired: z.coerce.number().int().min(1).max(5).optional(),
  disconnectSlack: z.boolean().optional(),
});

const deleteSchema = z.object({
  confirmName: z.string().trim().min(2).max(80),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;
  if (auth.kind !== "session") {
    return forbidden();
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: auth.workspaceId },
    select: {
      id: true,
      name: true,
      slug: true,
      statusPageEnabled: true,
      planTier: true,
      slackChannelId: true,
      slackTeamId: true,
      samlEnabled: true,
      samlMetadataUrl: true,
      samlOrganizationId: true,
      samlConnectionId: true,
      complianceMode: true,
      billing: {
        select: {
          dodoCustomerId: true,
          dodoSubscriptionId: true,
          status: true,
        },
      },
    },
  });

  return NextResponse.json({
    workspace,
    slackInstallUrl: slackInstallUrl(auth.workspaceId),
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;
  if (auth.kind !== "session") {
    return forbidden();
  }
  if (!hasRole({ user: auth.user }, [Role.OWNER, Role.MANAGER])) {
    return forbidden();
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid workspace settings payload.");
  }

  const current = await prisma.workspace.findUnique({
    where: { id: auth.workspaceId },
    select: {
      slug: true,
      statusPageEnabled: true,
      complianceMode: true,
      name: true,
      planTier: true,
      samlEnabled: true,
      samlMetadataUrl: true,
      samlOrganizationId: true,
      samlConnectionId: true,
    },
  });
  if (!current) {
    return forbidden();
  }

  if (parsed.data.samlEnabled && !isFeatureAllowed(current.planTier, "saml")) {
    return badRequest(featureGateError("saml"));
  }

  if (parsed.data.complianceMode && !current.complianceMode && !isFeatureAllowed(current.planTier, "compliance")) {
    return badRequest(featureGateError("compliance"));
  }

  const nextStatusPageEnabled =
    parsed.data.statusPageEnabled ?? current.statusPageEnabled;
  const providedSlug = parsed.data.slug;
  const normalizedSlug =
    providedSlug === undefined
      ? current.slug
      : (providedSlug?.trim().toLowerCase() || null);

  if (normalizedSlug && !statusSlugPattern.test(normalizedSlug)) {
    return badRequest(
      "Status page slug must match ^[a-z0-9-]{3,60}$.",
    );
  }

  if (nextStatusPageEnabled && !normalizedSlug) {
    return badRequest("Status page slug is required when public status page is enabled.");
  }

  const nextSamlEnabled = parsed.data.samlEnabled ?? current.samlEnabled;
  const nextSamlMetadataUrl =
    parsed.data.samlMetadataUrl === undefined
      ? current.samlMetadataUrl
      : (parsed.data.samlMetadataUrl?.trim() || null);

  if (nextSamlMetadataUrl) {
    const metadataValidation = z.url().safeParse(nextSamlMetadataUrl);
    if (!metadataValidation.success) {
      return badRequest("SAML metadata URL must be a valid URL.");
    }
  }

  if (nextSamlEnabled && !nextSamlMetadataUrl) {
    return badRequest("SAML metadata URL is required when SAML SSO is enabled.");
  }

  let nextSamlOrganizationId = current.samlOrganizationId;
  let nextSamlConnectionId = current.samlConnectionId;

  const shouldSyncSamlConnection =
    nextSamlEnabled &&
    (parsed.data.samlEnabled === true ||
      parsed.data.samlMetadataUrl !== undefined ||
      !current.samlOrganizationId ||
      !current.samlConnectionId);

  if (shouldSyncSamlConnection) {
    if (!isSamlSsoSupported()) {
      return badRequest(
        "SAML SSO requires STYTCH_OAUTH_START_MODE=b2b_discovery and STYTCH_PUBLIC_TOKEN.",
      );
    }

    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return forbidden();
    }

    try {
      const memberSession = await authenticateB2BMemberSession(sessionToken);
      const synced = await syncWorkspaceSamlConnection({
        organizationId: memberSession.organizationId,
        metadataUrl: nextSamlMetadataUrl ?? "",
        workspaceName: current.name,
        connectionId: current.samlConnectionId,
      });
      nextSamlOrganizationId = synced.organizationId;
      nextSamlConnectionId = synced.connectionId;
    } catch (error) {
      log.app.error("Failed to sync workspace SAML settings", {
        workspaceId: auth.workspaceId,
        metadataUrlPresent: Boolean(nextSamlMetadataUrl),
        hasConnectionId: Boolean(current.samlConnectionId),
        error: error instanceof Error ? error.message : String(error),
      });
      return badRequest("Unable to configure SAML connection. Verify metadata URL and try again.");
    }
  }

  if (current.complianceMode && parsed.data.complianceMode === false) {
    return badRequest("Compliance mode cannot be disabled once enabled.");
  }

  let updated;
  try {
    updated = await prisma.workspace.update({
      where: {
        id: auth.workspaceId,
      },
      data: {
        slug: providedSlug === undefined ? undefined : normalizedSlug,
        statusPageEnabled: parsed.data.statusPageEnabled,
        complianceMode: parsed.data.complianceMode,
        slackChannelId: parsed.data.slackChannelId?.trim() || null,
        samlEnabled: nextSamlEnabled,
        samlMetadataUrl: nextSamlMetadataUrl,
        samlOrganizationId: nextSamlOrganizationId,
        samlConnectionId: nextSamlConnectionId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        statusPageEnabled: true,
        planTier: true,
        slackChannelId: true,
        slackTeamId: true,
        samlEnabled: true,
        samlMetadataUrl: true,
        samlOrganizationId: true,
        samlConnectionId: true,
        complianceMode: true,
        billing: {
          select: {
            dodoCustomerId: true,
            dodoSubscriptionId: true,
            status: true,
          },
        },
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return badRequest("Status page slug is already in use.");
    }
    throw error;
  }

  return NextResponse.json({ workspace: updated });
}
