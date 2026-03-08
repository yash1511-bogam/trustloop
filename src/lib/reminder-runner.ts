import { EventType, IncidentSeverity, IncidentStatus, ReminderStatus } from "@prisma/client";
import { consumeWorkspaceQuota, enforceWorkspaceQuota } from "@/lib/policy";
import { prisma } from "@/lib/prisma";
import { refreshWorkspaceReadModels } from "@/lib/read-models";
import { sendReminderEmail } from "@/lib/email";
import { deleteReminderMessage, enqueueReminder } from "@/lib/queue";
import { sendSmsAlert } from "@/lib/sms";

export type ReminderPayload = {
  workspaceId: string;
  incidentId: string;
  queuedAt: string;
  dueAt?: string;
};

function safeDate(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function reminderIntervalHours(
  severity: IncidentSeverity,
  quotaPolicy: {
    reminderIntervalHoursP1: number;
    reminderIntervalHoursP2: number;
  } | null,
): number {
  if (severity === IncidentSeverity.P1) {
    return quotaPolicy?.reminderIntervalHoursP1 ?? 4;
  }
  return quotaPolicy?.reminderIntervalHoursP2 ?? 24;
}

function delaySecondsUntil(targetMs: number): number {
  const remainingSeconds = Math.ceil((targetMs - Date.now()) / 1000);
  return Math.min(900, Math.max(60, remainingSeconds));
}

export async function processReminderPayload(input: {
  payload: ReminderPayload;
  messageId?: string;
}): Promise<void> {
  const payload = input.payload;

  try {
    const [incident, quotaPolicy] = await Promise.all([
      prisma.incident.findFirst({
        where: {
          id: payload.incidentId,
          workspaceId: payload.workspaceId,
        },
        select: {
          id: true,
          workspaceId: true,
          status: true,
          severity: true,
          title: true,
          owner: {
            select: {
              email: true,
              phone: true,
            },
          },
        },
      }),
      prisma.workspaceQuota.findUnique({
        where: { workspaceId: payload.workspaceId },
        select: {
          reminderIntervalHoursP1: true,
          reminderIntervalHoursP2: true,
        },
      }),
    ]);

    if (!incident) {
      return;
    }

    const isOpen = incident.status !== IncidentStatus.RESOLVED;
    const intervalHours = reminderIntervalHours(incident.severity, quotaPolicy);
    const intervalMs = intervalHours * 3_600_000;
    const dueAt =
      safeDate(payload.dueAt) ??
      new Date((safeDate(payload.queuedAt) ?? new Date()).getTime() + intervalMs);

    if (isOpen && Date.now() < dueAt.getTime()) {
      const messageId = await enqueueReminder({
        workspaceId: payload.workspaceId,
        incidentId: incident.id,
        queuedAt: payload.queuedAt,
        dueAt: dueAt.toISOString(),
        delaySeconds: delaySecondsUntil(dueAt.getTime()),
      });

      await prisma.$transaction(async (tx) => {
        if (input.messageId) {
          await tx.reminderJobLog.updateMany({
            where: {
              queueMessageId: input.messageId,
              incidentId: incident.id,
            },
            data: {
              status: ReminderStatus.PROCESSED,
              processedAt: new Date(),
              errorMessage: null,
            },
          });
        }

        await tx.reminderJobLog.create({
          data: {
            workspaceId: payload.workspaceId,
            incidentId: incident.id,
            queueMessageId: messageId,
            status: ReminderStatus.QUEUED,
          },
        });
      });

      return;
    }

    await prisma.$transaction(async (tx) => {
      if (isOpen) {
        await tx.incidentEvent.create({
          data: {
            incidentId: incident.id,
            eventType: EventType.REMINDER,
            body: `Automated reminder: incident is still ${incident.status}. Please update owner action and customer status.`,
          },
        });

        await tx.incident.update({
          where: { id: incident.id },
          data: {
            remindersSentCount: { increment: 1 },
          },
        });
      }

      if (input.messageId) {
        await tx.reminderJobLog.updateMany({
          where: {
            queueMessageId: input.messageId,
            incidentId: incident.id,
          },
          data: {
            status: ReminderStatus.PROCESSED,
            processedAt: new Date(),
            errorMessage: null,
          },
        });
      }
    });

    if (isOpen && incident.owner?.email) {
      const quota = await enforceWorkspaceQuota(payload.workspaceId, "reminder_emails");
      if (quota.allowed) {
        const emailResult = await sendReminderEmail({
          workspaceId: payload.workspaceId,
          incidentId: incident.id,
          toEmail: incident.owner.email,
          incidentTitle: incident.title,
          incidentStatus: incident.status,
        });

        if (emailResult.success) {
          await consumeWorkspaceQuota(payload.workspaceId, "reminder_emails", 1);
        }
      }
    }

    if (
      isOpen &&
      incident.severity === IncidentSeverity.P1 &&
      incident.owner?.phone
    ) {
      await sendSmsAlert({
        toPhone: incident.owner.phone,
        message: `TrustLoop P1 incident: ${incident.title} is still ${incident.status}.`,
      }).catch(() => null);
    }

    if (isOpen) {
      const nextDueAtMs = Date.now() + intervalMs;

      const messageId = await enqueueReminder({
        workspaceId: payload.workspaceId,
        incidentId: incident.id,
        queuedAt: new Date().toISOString(),
        dueAt: new Date(nextDueAtMs).toISOString(),
        delaySeconds: delaySecondsUntil(nextDueAtMs),
      });

      await prisma.reminderJobLog.create({
        data: {
          workspaceId: payload.workspaceId,
          incidentId: incident.id,
          queueMessageId: messageId,
          status: ReminderStatus.QUEUED,
        },
      });
      await refreshWorkspaceReadModels(payload.workspaceId);
    }

  } catch (error) {
    if (input.messageId) {
      await prisma.reminderJobLog.updateMany({
        where: {
          queueMessageId: input.messageId,
        },
        data: {
          status: ReminderStatus.FAILED,
          errorMessage:
            error instanceof Error ? error.message.slice(0, 500) : "Reminder processing failed.",
          processedAt: new Date(),
        },
      });
    }

    throw error;
  }
}

export async function processReminderMessage(rawMessage: {
  messageId?: string;
  receiptHandle?: string;
  body?: string;
}): Promise<void> {
  if (!rawMessage.body || !rawMessage.receiptHandle) {
    return;
  }

  const payload = JSON.parse(rawMessage.body) as ReminderPayload;
  await processReminderPayload({
    payload,
    messageId: rawMessage.messageId,
  });
  await deleteReminderMessage(rawMessage.receiptHandle);
}
