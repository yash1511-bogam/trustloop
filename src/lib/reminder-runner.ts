import {
  EventType,
  IncidentSeverity,
  IncidentStatus,
  ReminderStatus,
  Role,
} from "@prisma/client";
import { enforceWorkspaceQuota, consumeWorkspaceQuota } from "@/lib/policy";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { refreshWorkspaceReadModels } from "@/lib/read-models";
import { sendReminderEmail } from "@/lib/email";
import { sendWorkspaceUserPushNotifications } from "@/lib/push";
import { deleteReminderMessage, enqueueReminder } from "@/lib/queue";
import { sendSmsAlert } from "@/lib/sms";

export type ReminderPayload = {
  workspaceId: string;
  incidentId: string;
  queuedAt: string;
  dueAt?: string;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

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

function onCallRotationIndex(input: {
  anchorAt: Date;
  intervalHours: number;
  poolSize: number;
}): number {
  if (input.poolSize <= 1) {
    return 0;
  }

  const intervalMs = Math.max(1, Math.floor(input.intervalHours)) * 3_600_000;
  const elapsedMs = Date.now() - input.anchorAt.getTime();
  const elapsedBuckets = Math.max(0, Math.floor(elapsedMs / intervalMs));
  return elapsedBuckets % input.poolSize;
}

export async function processReminderPayload(input: {
  payload: ReminderPayload;
  messageId?: string;
}): Promise<void> {
  const payload = input.payload;

  log.worker.debug("Processing reminder payload", {
    workspaceId: payload.workspaceId,
    incidentId: payload.incidentId,
    messageId: input.messageId ?? null,
    queuedAt: payload.queuedAt,
    dueAt: payload.dueAt ?? null,
  });

  try {
    // Skip reminders for workspaces with canceled or past-due billing
    const billing = await prisma.workspaceBilling.findUnique({
      where: { workspaceId: payload.workspaceId },
      select: { status: true },
    });
    if (billing?.status === "CANCELED" || billing?.status === "PAST_DUE") {
      log.worker.info("Skipping reminder for workspace with inactive billing", {
        workspaceId: payload.workspaceId,
        incidentId: payload.incidentId,
        billingStatus: billing.status,
      });
      if (input.messageId) {
        await prisma.reminderJobLog.updateMany({
          where: { queueMessageId: input.messageId },
          data: { status: ReminderStatus.PROCESSED, processedAt: new Date(), errorMessage: `Skipped: billing ${billing.status}` },
        });
      }
      return;
    }

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
          remindersSentCount: true,
          owner: {
            select: {
              id: true,
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
          onCallRotationEnabled: true,
          onCallRotationIntervalHours: true,
          onCallRotationAnchorAt: true,
        },
      }),
    ]);

    if (!incident) {
      log.worker.warn("Reminder payload incident not found", {
        workspaceId: payload.workspaceId,
        incidentId: payload.incidentId,
        messageId: input.messageId ?? null,
      });
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

      log.worker.debug("Reminder deferred until due time", {
        workspaceId: payload.workspaceId,
        incidentId: incident.id,
        messageId: input.messageId ?? null,
        deferredQueueMessageId: messageId,
        dueAt: dueAt.toISOString(),
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
          // Quota already reserved by enforceWorkspaceQuota
        } else {
          // Roll back the reserved quota on send failure
          await consumeWorkspaceQuota(payload.workspaceId, "reminder_emails", -1);
          log.worker.warn("Reminder email provider did not confirm send", {
            workspaceId: payload.workspaceId,
            incidentId: incident.id,
            toEmail: incident.owner.email,
          });
        }
      } else {
        log.worker.warn("Reminder email blocked by quota", {
          workspaceId: payload.workspaceId,
          incidentId: incident.id,
          quotaLimit: quota.limit,
        });
      }
    }

    if (isOpen && incident.severity === IncidentSeverity.P1) {
      const smsTargets = new Set<string>();
      const pushTargetUserIds = new Set<string>();
      const shouldEscalate = incident.remindersSentCount >= 1;
      const managers = await prisma.user.findMany({
        where: {
          workspaceId: payload.workspaceId,
          role: {
            in: [Role.OWNER, Role.MANAGER],
          },
          phone: {
            not: null,
          },
        },
        select: {
          id: true,
          phone: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      if (incident.owner?.phone) {
        smsTargets.add(incident.owner.phone);
      }
      if (incident.owner?.id) {
        pushTargetUserIds.add(incident.owner.id);
      }

      if (managers.length > 0) {
        if (quotaPolicy?.onCallRotationEnabled) {
          const activeIndex = onCallRotationIndex({
            anchorAt: quotaPolicy.onCallRotationAnchorAt,
            intervalHours: quotaPolicy.onCallRotationIntervalHours,
            poolSize: managers.length,
          });
          const onCall = managers[activeIndex];

          if (onCall?.phone) {
            smsTargets.add(onCall.phone);
          }
          if (onCall?.id) {
            pushTargetUserIds.add(onCall.id);
          }

          if (shouldEscalate) {
            for (const manager of managers) {
              if (manager.phone) {
                smsTargets.add(manager.phone);
              }
              pushTargetUserIds.add(manager.id);
            }
          }

          log.worker.info("P1 escalation on-call rotation recipients selected", {
            workspaceId: payload.workspaceId,
            incidentId: incident.id,
            managerCount: managers.length,
            activeOnCallUserId: onCall?.id ?? null,
            shouldEscalate,
            recipientCount: smsTargets.size,
          });
        } else if (!incident.owner?.phone || shouldEscalate) {
          for (const manager of managers) {
            if (manager.phone) {
              smsTargets.add(manager.phone);
            }
            pushTargetUserIds.add(manager.id);
          }
        }
      }

      for (const phone of smsTargets) {
        try {
          await sendSmsAlert({
            toPhone: phone,
            message: `TrustLoop P1 incident: ${incident.title} is still ${incident.status}.`,
          });
        } catch (error) {
          log.worker.error("P1 SMS escalation failed", {
            workspaceId: payload.workspaceId,
            incidentId: incident.id,
            toPhone: phone,
            error: errorMessage(error),
          });
        }
      }

      const pushResult = await sendWorkspaceUserPushNotifications({
        workspaceId: payload.workspaceId,
        userIds: Array.from(pushTargetUserIds),
        payload: {
          title: "TrustLoop P1 escalation",
          body: `${incident.title} is still ${incident.status}.`,
          url: `/incidents/${incident.id}`,
          tag: `incident-${incident.id}`,
          data: {
            incidentId: incident.id,
            severity: incident.severity,
          },
        },
      });

      if (!pushResult.skipped) {
        log.worker.info("P1 push notifications sent", {
          workspaceId: payload.workspaceId,
          incidentId: incident.id,
          sent: pushResult.sent,
          failed: pushResult.failed,
          disabled: pushResult.disabled,
        });
      }
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
      log.worker.info("Reminder processed and re-queued", {
        workspaceId: payload.workspaceId,
        incidentId: incident.id,
        nextQueueMessageId: messageId,
      });
    } else {
      log.worker.info("Reminder processed for resolved incident", {
        workspaceId: payload.workspaceId,
        incidentId: incident.id,
      });
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

    log.worker.error("Reminder payload processing failed", {
      workspaceId: payload.workspaceId,
      incidentId: payload.incidentId,
      messageId: input.messageId ?? null,
      error: errorMessage(error),
    });
    throw error;
  }
}

export async function processReminderMessage(rawMessage: {
  messageId?: string;
  receiptHandle?: string;
  body?: string;
}): Promise<void> {
  if (!rawMessage.body || !rawMessage.receiptHandle) {
    log.worker.warn("Skipping malformed reminder queue message", {
      messageId: rawMessage.messageId ?? null,
      hasBody: Boolean(rawMessage.body),
      hasReceiptHandle: Boolean(rawMessage.receiptHandle),
    });
    return;
  }

  let payload: ReminderPayload;
  try {
    payload = JSON.parse(rawMessage.body) as ReminderPayload;
  } catch (error) {
    log.worker.error("Failed to parse reminder queue payload JSON", {
      messageId: rawMessage.messageId ?? null,
      error: errorMessage(error),
    });
    throw error;
  }

  await processReminderPayload({
    payload,
    messageId: rawMessage.messageId,
  });
  await deleteReminderMessage(rawMessage.receiptHandle);
  log.worker.debug("Deleted processed reminder queue message", {
    messageId: rawMessage.messageId ?? null,
  });
}
