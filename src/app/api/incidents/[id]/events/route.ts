import { NextRequest, NextResponse } from "next/server";
import { EventType } from "@prisma/client";
import { z } from "zod";
import { recordAuditForAccess } from "@/lib/audit";
import { requireApiAuthAndRateLimit, withRateLimitHeaders } from "@/lib/api-guard";
import { badRequest, notFound } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const eventSchema = z.object({
  body: z.string().min(2).max(2000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request, {
    allowApiKey: true,
    requiredApiKeyScopes: ["incidents:write"],
  });
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;

  const { id } = await params;

  const incident = await prisma.incident.findFirst({
    where: { id, workspaceId: auth.workspaceId },
    select: { id: true },
  });

  if (!incident) {
    return notFound("Incident not found.");
  }

  const body = await request.json().catch(() => null);
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid event payload.");
  }

  const event = await prisma.$transaction(async (tx) => {
    const created = await tx.incidentEvent.create({
      data: {
        incidentId: incident.id,
        actorUserId: auth.actorUserId,
        eventType: EventType.NOTE,
        body: parsed.data.body.trim(),
      },
    });

    await tx.incident.updateMany({
      where: {
        id: incident.id,
        firstRespondedAt: null,
      },
      data: {
        firstRespondedAt: new Date(),
      },
    });

    return created;
  });

  await recordAuditForAccess({
    access: auth,
    request,
    action: "incident.note_added",
    targetType: "incident",
    targetId: incident.id,
    summary: "Added internal incident note.",
  });

  return withRateLimitHeaders(
    NextResponse.json({ event }, { status: 201 }),
    access.rateLimit,
  );
}
