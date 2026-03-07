import { NextRequest, NextResponse } from "next/server";
import { EventType } from "@prisma/client";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { badRequest, notFound, unauthorized } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const eventSchema = z.object({
  body: z.string().min(2).max(2000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await getAuth();
  if (!auth) {
    return unauthorized();
  }

  const { id } = await params;

  const incident = await prisma.incident.findFirst({
    where: { id, workspaceId: auth.user.workspaceId },
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

  const event = await prisma.incidentEvent.create({
    data: {
      incidentId: incident.id,
      actorUserId: auth.user.id,
      eventType: EventType.NOTE,
      body: parsed.data.body.trim(),
    },
  });

  return NextResponse.json({ event }, { status: 201 });
}
