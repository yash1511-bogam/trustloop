import { NextRequest, NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { hasRole } from "@/lib/auth";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { badRequest, forbidden } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { slackInstallUrl } from "@/lib/slack";

const updateSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  statusPageEnabled: z.boolean().optional(),
  slackChannelId: z.string().max(60).optional().nullable(),
  samlEnabled: z.boolean().optional(),
  samlMetadataUrl: z.string().url().max(500).optional().nullable(),
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
      stripeCustomerId: true,
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

  let updated;
  try {
    updated = await prisma.workspace.update({
      where: {
        id: auth.workspaceId,
      },
      data: {
        slug: parsed.data.slug?.toLowerCase(),
        statusPageEnabled: parsed.data.statusPageEnabled,
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
        stripeCustomerId: true,
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
