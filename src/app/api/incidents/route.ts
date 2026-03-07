import { NextRequest, NextResponse } from "next/server";
import {
  EventType,
  IncidentChannel,
  IncidentSeverity,
  IncidentStatus,
} from "@prisma/client";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { badRequest, unauthorized } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const createIncidentSchema = z.object({
  title: z.string().min(3).max(180),
  description: z.string().min(8).max(5000),
  customerName: z.string().max(120).optional().nullable(),
  customerEmail: z.email().max(160).optional().nullable(),
  channel: z.nativeEnum(IncidentChannel).optional(),
  severity: z.nativeEnum(IncidentSeverity).optional(),
  modelVersion: z.string().max(100).optional().nullable(),
  sourceTicketRef: z.string().max(120).optional().nullable(),
});

export async function GET(): Promise<NextResponse> {
  const auth = await getAuth();
  if (!auth) {
    return unauthorized();
  }

  const incidents = await prisma.incident.findMany({
    where: { workspaceId: auth.user.workspaceId },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      _count: {
        select: { events: true },
      },
    },
    orderBy: [{ severity: "asc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json({ incidents });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await getAuth();
  if (!auth) {
    return unauthorized();
  }

  const body = await request.json().catch(() => null);
  const parsed = createIncidentSchema.safeParse(body);

  if (!parsed.success) {
    return badRequest("Invalid incident payload.");
  }

  const incident = await prisma.$transaction(async (tx) => {
    const created = await tx.incident.create({
      data: {
        workspaceId: auth.user.workspaceId,
        title: parsed.data.title.trim(),
        description: parsed.data.description.trim(),
        customerName: parsed.data.customerName?.trim() || null,
        customerEmail: parsed.data.customerEmail?.trim().toLowerCase() || null,
        channel: parsed.data.channel ?? IncidentChannel.EMAIL,
        severity: parsed.data.severity ?? IncidentSeverity.P3,
        status: IncidentStatus.NEW,
        ownerUserId: auth.user.id,
        modelVersion: parsed.data.modelVersion?.trim() || null,
        sourceTicketRef: parsed.data.sourceTicketRef?.trim() || null,
      },
    });

    await tx.incidentEvent.create({
      data: {
        incidentId: created.id,
        actorUserId: auth.user.id,
        eventType: EventType.CREATED,
        body: "Incident created.",
      },
    });

    return created;
  });

  return NextResponse.json({ incident }, { status: 201 });
}
