import { NextRequest, NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { hasRole } from "@/lib/auth";
import { recordAuditForAccess } from "@/lib/audit";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { resolveEffectivePlanTier } from "@/lib/billing-plan";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { badRequest, forbidden } from "@/lib/http";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { slackInstallUrl } from "@/lib/slack";
import { featureGateError, isFeatureAllowed } from "@/lib/feature-gate";
import {
  authenticateB2BMemberSession,
  isSamlSsoSupported,
  syncWorkspaceSamlConnection,
} from "@/lib/stytch";

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
      trialEndsAt: true,
      billing: {
        select: {
          dodoCustomerId: true,
          dodoSubscriptionId: true,
          status: true,
        },
      },
    },
  });
  const effectivePlanTier = resolveEffectivePlanTier({
    planTier: workspace?.planTier,
    billingStatus: workspace?.billing?.status,
    trialEndsAt: workspace?.trialEndsAt,
  });

  return NextResponse.json({
    workspace: workspace
      ? {
          ...workspace,
          planTier: effectivePlanTier,
        }
      : null,
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
      trialEndsAt: true,
      billing: {
        select: {
          status: true,
        },
      },
    },
  });
  if (!current) {
    return forbidden();
  }
  const effectivePlanTier = resolveEffectivePlanTier({
    planTier: current.planTier,
    billingStatus: current.billing?.status,
    trialEndsAt: current.trialEndsAt,
  });

  if (parsed.data.samlEnabled && !isFeatureAllowed(effectivePlanTier, "saml")) {
    return badRequest(featureGateError("saml"));
  }

  if (
    parsed.data.complianceMode &&
    !current.complianceMode &&
    !isFeatureAllowed(effectivePlanTier, "compliance")
  ) {
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
        name: parsed.data.name,
        slug: providedSlug === undefined ? undefined : normalizedSlug,
        statusPageEnabled: parsed.data.statusPageEnabled,
        complianceMode: parsed.data.complianceMode,
        slackChannelId: parsed.data.disconnectSlack
          ? null
          : (parsed.data.slackChannelId?.trim() || null),
        slackBotToken: parsed.data.disconnectSlack ? null : undefined,
        slackTeamId: parsed.data.disconnectSlack ? null : undefined,
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
        trialEndsAt: true,
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

  const updatedEffectivePlanTier = resolveEffectivePlanTier({
    planTier: updated.planTier,
    billingStatus: updated.billing?.status,
    trialEndsAt: updated.trialEndsAt,
  });

  return NextResponse.json({
    workspace: {
      ...updated,
      planTier: updatedEffectivePlanTier,
    },
  });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) return access.response;
  const auth = access.auth;
  if (auth.kind !== "session") return forbidden();
  if (!hasRole({ user: auth.user }, [Role.OWNER])) return forbidden();

  const body = await request.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) return badRequest("Confirm workspace name to delete.");

  const workspace = await prisma.workspace.findUnique({
    where: { id: auth.workspaceId },
    select: { name: true, scheduledDeletionAt: true },
  });
  if (!workspace) return forbidden();

  if (parsed.data.confirmName !== workspace.name) {
    return badRequest("Workspace name does not match.");
  }

  // Schedule deletion with 24h grace period
  const deletionAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.workspace.update({
    where: { id: auth.workspaceId },
    data: { scheduledDeletionAt: deletionAt },
  });

  await recordAuditForAccess({
    access: auth,
    request,
    action: "workspace.deletion_scheduled",
    targetType: "Workspace",
    targetId: auth.workspaceId,
    summary: `Workspace deletion scheduled for ${deletionAt.toISOString()}`,
  }).catch(() => {});

  return NextResponse.json({ scheduledDeletionAt: deletionAt });
}
