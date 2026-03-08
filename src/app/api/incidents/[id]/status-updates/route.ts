import { NextRequest, NextResponse } from "next/server";
import { EventType } from "@prisma/client";
import { z } from "zod";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { badRequest, notFound } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const publishSchema = z.object({
  body: z.string().min(8).max(2000),
  isVisible: z.boolean().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request, { allowApiKey: true });
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;
  const { id } = await params;

  const incident = await prisma.incident.findFirst({
    where: { id, workspaceId: auth.workspaceId },
    select: {
      id: true,
      workspaceId: true,
    },
  });

  if (!incident) {
    return notFound("Incident not found.");
  }

  const body = await request.json().catch(() => null);
  const parsed = publishSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid status update payload.");
  }

  const published = await prisma.$transaction(async (tx) => {
    const statusUpdate = await tx.statusUpdate.create({
      data: {
        workspaceId: incident.workspaceId,
        incidentId: incident.id,
        body: parsed.data.body.trim(),
        publishedAt: new Date(),
        isVisible: parsed.data.isVisible ?? true,
        createdByUserId: auth.actorUserId,
      },
    });

    await tx.incidentEvent.create({
      data: {
        incidentId: incident.id,
        actorUserId: auth.actorUserId,
        eventType: EventType.CUSTOMER_UPDATE,
        body: `Published status page update: ${parsed.data.body.trim()}`,
      },
    });

    return statusUpdate;
  });

  return NextResponse.json({ statusUpdate: published }, { status: 201 });
}
