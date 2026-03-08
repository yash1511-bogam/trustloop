import { NextRequest, NextResponse } from "next/server";
import { IncidentStatus, ReminderStatus, Role } from "@prisma/client";
import { hasRole } from "@/lib/auth";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { enqueueReminder } from "@/lib/queue";
import { forbidden } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const STALE_MINUTES = Number(process.env.REMINDER_STALE_MINUTES ?? 240);

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

  const staleBefore = new Date(Date.now() - STALE_MINUTES * 60 * 1000);

  const incidents = await prisma.incident.findMany({
    where: {
      workspaceId: auth.workspaceId,
      status: {
        in: [
          IncidentStatus.NEW,
          IncidentStatus.INVESTIGATING,
          IncidentStatus.MITIGATED,
        ],
      },
      updatedAt: {
        lte: staleBefore,
      },
    },
    select: { id: true },
    take: 100,
  });

  const queued: Array<{ incidentId: string; messageId?: string }> = [];

  for (const incident of incidents) {
    const messageId = await enqueueReminder({
      workspaceId: auth.workspaceId,
      incidentId: incident.id,
      queuedAt: new Date().toISOString(),
    });

    await prisma.reminderJobLog.create({
      data: {
        workspaceId: auth.workspaceId,
        incidentId: incident.id,
        queueMessageId: messageId,
        status: ReminderStatus.QUEUED,
      },
    });

    queued.push({ incidentId: incident.id, messageId: messageId ?? undefined });
  }

  return NextResponse.json({
    queuedCount: queued.length,
    queued,
  });
}
