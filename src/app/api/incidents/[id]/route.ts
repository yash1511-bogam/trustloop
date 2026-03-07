import { NextRequest, NextResponse } from "next/server";
import { EventType, IncidentSeverity, IncidentStatus } from "@prisma/client";
import { z } from "zod";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { badRequest, notFound } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { refreshWorkspaceReadModels } from "@/lib/read-models";

const patchSchema = z.object({
  status: z.nativeEnum(IncidentStatus).optional(),
  severity: z.nativeEnum(IncidentSeverity).optional(),
  category: z.string().max(80).optional().nullable(),
  summary: z.string().max(1000).optional().nullable(),
  ownerUserId: z.string().optional().nullable(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit();
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;

  const { id } = await params;

  const incident = await prisma.incident.findFirst({
    where: { id, workspaceId: auth.user.workspaceId },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      events: {
        include: {
          actor: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!incident) {
    return notFound("Incident not found.");
  }

  return NextResponse.json({ incident });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit();
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return badRequest("Invalid incident update payload.");
  }

  const { id } = await params;

  const existing = await prisma.incident.findFirst({
    where: { id, workspaceId: auth.user.workspaceId },
  });

  if (!existing) {
    return notFound("Incident not found.");
  }

  let resolvedAtValue: Date | null | undefined = undefined;
  if (parsed.data.status !== undefined) {
    resolvedAtValue =
      parsed.data.status === IncidentStatus.RESOLVED ? new Date() : null;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const incident = await tx.incident.update({
      where: { id: existing.id },
      data: {
        status: parsed.data.status,
        severity: parsed.data.severity,
        category: parsed.data.category?.trim() || null,
        summary: parsed.data.summary?.trim() || null,
        ownerUserId: parsed.data.ownerUserId ?? undefined,
        resolvedAt: resolvedAtValue,
      },
    });

    const changed: string[] = [];
    if (parsed.data.status && parsed.data.status !== existing.status) {
      changed.push(`status ${existing.status} -> ${parsed.data.status}`);
    }
    if (parsed.data.severity && parsed.data.severity !== existing.severity) {
      changed.push(`severity ${existing.severity} -> ${parsed.data.severity}`);
    }
    if (
      parsed.data.ownerUserId !== undefined &&
      parsed.data.ownerUserId !== existing.ownerUserId
    ) {
      changed.push("owner updated");
    }

    if (changed.length > 0) {
      await tx.incidentEvent.create({
        data: {
          incidentId: incident.id,
          actorUserId: auth.user.id,
          eventType: EventType.STATUS_CHANGED,
          body: `Incident updated: ${changed.join(", ")}.`,
        },
      });
    }

    return incident;
  });

  await refreshWorkspaceReadModels(auth.user.workspaceId);
  return NextResponse.json({ incident: updated });
}
