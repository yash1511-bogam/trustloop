import { NextRequest, NextResponse } from "next/server";
import { IncidentStatus, ReminderStatus, Role } from "@prisma/client";
import { hasRole } from "@/lib/auth";
import { verifyCronSecret } from "@/lib/cron-auth";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { enqueueReminder } from "@/lib/queue";
import { forbidden } from "@/lib/http";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const STALE_MINUTES = Number(process.env.REMINDER_STALE_MINUTES ?? 240);

export async function POST(request: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.REMINDER_ENQUEUE_CRON_SECRET;
  const cronHeader = request.headers.get("x-cron-secret");
  const isCron = verifyCronSecret(cronSecret, cronHeader);

  let workspaceScope: string | null = null;

  if (!isCron) {
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
    workspaceScope = auth.workspaceId;
  }

  const staleBefore = new Date(Date.now() - STALE_MINUTES * 60 * 1000);

  const incidents = await prisma.incident.findMany({
    where: {
      workspaceId: workspaceScope ?? undefined,
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
    select: {
      id: true,
      workspaceId: true,
    },
    orderBy: {
      updatedAt: "asc",
    },
    take: isCron ? 500 : 100,
  });

  const queuedExisting = await prisma.reminderJobLog.findMany({
    where: {
      status: ReminderStatus.QUEUED,
      incidentId: {
        in: incidents.map((incident) => incident.id),
      },
    },
    select: {
      incidentId: true,
    },
  });

  const existingQueuedIncidentIds = new Set(
    queuedExisting.map((record) => record.incidentId),
  );

  const queued: Array<{ incidentId: string; messageId?: string }> = [];
  let skippedAlreadyQueued = 0;

  for (const incident of incidents) {
    if (existingQueuedIncidentIds.has(incident.id)) {
      skippedAlreadyQueued += 1;
      continue;
    }

    const messageId = await enqueueReminder({
      workspaceId: incident.workspaceId,
      incidentId: incident.id,
      queuedAt: new Date().toISOString(),
      dueAt: new Date().toISOString(),
    });

    await prisma.reminderJobLog.create({
      data: {
        workspaceId: incident.workspaceId,
        incidentId: incident.id,
        queueMessageId: messageId,
        status: ReminderStatus.QUEUED,
      },
    });

    queued.push({ incidentId: incident.id, messageId: messageId ?? undefined });
  }

  log.worker.info("Reminder enqueue automation completed", {
    isCron,
    workspaceScope,
    staleMinutes: STALE_MINUTES,
    considered: incidents.length,
    queuedCount: queued.length,
    skippedAlreadyQueued,
  });

  return NextResponse.json({
    isCron,
    workspaceScope,
    considered: incidents.length,
    skippedAlreadyQueued,
    queuedCount: queued.length,
    queued,
  });
}
