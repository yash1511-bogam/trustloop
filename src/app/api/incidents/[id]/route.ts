import { NextRequest, NextResponse } from "next/server";
import {
  AIIncidentCategory,
  EventType,
  IncidentSeverity,
  IncidentStatus,
  Role,
} from "@prisma/client";
import { z } from "zod";
import { hasRole } from "@/lib/auth";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { badRequest, forbidden, notFound } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { refreshWorkspaceReadModels } from "@/lib/read-models";
import { sendOwnerAssignedEmail } from "@/lib/email";

const patchSchema = z.object({
  status: z.nativeEnum(IncidentStatus).optional(),
  severity: z.nativeEnum(IncidentSeverity).optional(),
  category: z.nativeEnum(AIIncidentCategory).optional().nullable(),
  summary: z.string().max(1000).optional().nullable(),
  ownerUserId: z.string().optional().nullable(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(_request, { allowApiKey: true });
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;

  const { id } = await params;

  const incident = await prisma.incident.findFirst({
    where: { id, workspaceId: auth.workspaceId },
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
  const access = await requireApiAuthAndRateLimit(request, { allowApiKey: true });
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
    where: { id, workspaceId: auth.workspaceId },
    include: {
      owner: {
        select: { id: true, email: true, name: true },
      },
    },
  });

  if (!existing) {
    return notFound("Incident not found.");
  }

  let nextOwnerName: string | null = null;
  if (parsed.data.ownerUserId) {
    const nextOwner = await prisma.user.findFirst({
      where: {
        id: parsed.data.ownerUserId,
        workspaceId: auth.workspaceId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!nextOwner) {
      return badRequest("Owner must belong to this workspace.");
    }
    nextOwnerName = nextOwner.name;
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
        category:
          parsed.data.category !== undefined ? parsed.data.category : undefined,
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
    if (parsed.data.category !== undefined && parsed.data.category !== existing.category) {
      changed.push(
        `category ${existing.category ?? "Uncategorized"} -> ${parsed.data.category ?? "Uncategorized"}`,
      );
    }
    if (
      parsed.data.ownerUserId !== undefined &&
      parsed.data.ownerUserId !== existing.ownerUserId
    ) {
      changed.push("owner updated");
    }

    if (
      changed.length > 0 &&
      (parsed.data.status !== undefined ||
        parsed.data.severity !== undefined ||
        parsed.data.category !== undefined)
    ) {
      await tx.incidentEvent.create({
        data: {
          incidentId: incident.id,
          actorUserId: auth.actorUserId,
          eventType: EventType.STATUS_CHANGED,
          body: `Incident updated: ${changed.join(", ")}.`,
        },
      });
    }

    if (
      parsed.data.ownerUserId !== undefined &&
      parsed.data.ownerUserId !== existing.ownerUserId
    ) {
      await tx.incidentEvent.create({
        data: {
          incidentId: incident.id,
          actorUserId: auth.actorUserId,
          eventType: EventType.OWNER_CHANGED,
          body: `Owner changed from ${existing.owner?.name ?? "Unassigned"} to ${parsed.data.ownerUserId ? (nextOwnerName ?? "Assigned owner") : "Unassigned"}.`,
        },
      });
    }

    return incident;
  });

  if (
    parsed.data.ownerUserId &&
    parsed.data.ownerUserId !== existing.ownerUserId
  ) {
    const newOwner = await prisma.user.findUnique({
      where: { id: parsed.data.ownerUserId },
      select: {
        email: true,
        name: true,
      },
    });
    if (newOwner?.email) {
      await sendOwnerAssignedEmail({
        workspaceId: auth.workspaceId,
        incidentId: existing.id,
        toEmail: newOwner.email,
        ownerName: newOwner.name,
        incidentTitle: updated.title,
      }).catch(() => null);
    }
  }

  await refreshWorkspaceReadModels(auth.workspaceId);
  return NextResponse.json({ incident: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
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

  const { id } = await params;
  const incident = await prisma.incident.findFirst({
    where: {
      id,
      workspaceId: auth.workspaceId,
    },
    select: { id: true },
  });

  if (!incident) {
    return notFound("Incident not found.");
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: auth.workspaceId },
    select: { complianceMode: true },
  });

  if (workspace?.complianceMode) {
    return NextResponse.json(
      { error: "Compliance mode prevents deletion." },
      { status: 403 },
    );
  }

  await prisma.incident.delete({
    where: { id: incident.id },
  });
  await refreshWorkspaceReadModels(auth.workspaceId);

  return NextResponse.json({ deleted: true });
}
