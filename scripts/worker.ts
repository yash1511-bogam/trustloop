import { EventType, IncidentStatus, ReminderStatus } from "@prisma/client";
import {
  deleteReminderMessage,
  receiveReminderMessages,
  ensureReminderQueue,
} from "../src/lib/queue";
import { prisma } from "../src/lib/prisma";

type ReminderPayload = {
  workspaceId: string;
  incidentId: string;
  queuedAt: string;
};

async function processMessage(rawMessage: {
  messageId?: string;
  receiptHandle?: string;
  body?: string;
}): Promise<void> {
  if (!rawMessage.body || !rawMessage.receiptHandle) {
    return;
  }

  const payload = JSON.parse(rawMessage.body) as ReminderPayload;

  const incident = await prisma.incident.findFirst({
    where: {
      id: payload.incidentId,
      workspaceId: payload.workspaceId,
    },
    select: {
      id: true,
      status: true,
      title: true,
    },
  });

  if (!incident) {
    await deleteReminderMessage(rawMessage.receiptHandle);
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
    }

    if (rawMessage.messageId) {
      await tx.reminderJobLog.updateMany({
        where: {
          queueMessageId: rawMessage.messageId,
          incidentId: incident.id,
        },
        data: {
          status: ReminderStatus.PROCESSED,
          processedAt: new Date(),
        },
      });
    }
  });

  await deleteReminderMessage(rawMessage.receiptHandle);
}

async function run(): Promise<void> {
  const once = process.argv.includes("--once");

  await ensureReminderQueue();
  console.log("Worker started. once=", once);

  do {
    const messages = await receiveReminderMessages(10);

    if (messages.length === 0) {
      if (once) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
      continue;
    }

    for (const msg of messages) {
      await processMessage({
        messageId: msg.MessageId,
        receiptHandle: msg.ReceiptHandle,
        body: msg.Body,
      }).catch(async (error) => {
        console.error("Worker message failed:", error);

        if (msg.MessageId) {
          await prisma.reminderJobLog.updateMany({
            where: { queueMessageId: msg.MessageId },
            data: {
              status: ReminderStatus.FAILED,
              errorMessage:
                error instanceof Error ? error.message.slice(0, 500) : "Unknown",
            },
          });
        }
      });
    }
  } while (!once);

  await prisma.$disconnect();
  console.log("Worker stopped.");
}

run().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
