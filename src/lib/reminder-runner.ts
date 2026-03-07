
import { EventType, IncidentStatus, ReminderStatus } from "@prisma/client";
import { consumeWorkspaceQuota, enforceWorkspaceQuota } from "@/lib/policy";
import { prisma } from "@/lib/prisma";
import { refreshWorkspaceReadModels } from "@/lib/read-models";
import { sendReminderEmail } from "@/lib/email";
import { deleteReminderMessage } from "@/lib/queue";

export type ReminderPayload = {
  workspaceId: string;
  incidentId: string;
  queuedAt: string;
};

export async function processReminderPayload(input: {
  payload: ReminderPayload;
  messageId?: string;
}): Promise<void> {
  const payload = input.payload;
  const incident = await prisma.incident.findFirst({
    where: {
      id: payload.incidentId,
      workspaceId: payload.workspaceId,
    },
    select: {
      id: true,
      workspaceId: true,
      status: true,
      title: true,
      owner: {
        select: {
          email: true,
        },
      },
    },
  });

  if (!incident) {
    return;
  }

  const isOpen = incident.status !== IncidentStatus.RESOLVED;

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

  await refreshWorkspaceReadModels(payload.workspaceId);
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
