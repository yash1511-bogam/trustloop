import { NextRequest, NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { hasRole } from "@/lib/auth";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { badRequest, forbidden } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { slackInstallUrl } from "@/lib/slack";

const statusSlugPattern = /^[a-z0-9-]{3,60}$/;

const updateSchema = z.object({
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
    .url()
    .max(500)
    .optional()
    .nullable(),
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
    },
  });
  if (!current) {
    return forbidden();
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
        samlEnabled: parsed.data.samlEnabled,
        samlMetadataUrl: parsed.data.samlMetadataUrl?.trim() || null,
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
