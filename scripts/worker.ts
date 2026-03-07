import "dotenv/config";
import { ReminderStatus } from "@prisma/client";
import {
  ensureReminderQueue,
  receiveReminderMessages,
} from "../src/lib/queue";
import { processReminderMessage } from "../src/lib/reminder-runner";
import { prisma } from "../src/lib/prisma";

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
      await processReminderMessage({
        messageId: msg.MessageId,
        receiptHandle: msg.ReceiptHandle,
        body: msg.Body,
      }).catch(async (error) => {
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
