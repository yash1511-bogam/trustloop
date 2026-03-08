import "dotenv/config";
import { ReminderStatus } from "@prisma/client";
import {
  ensureReminderQueue,
  receiveReminderMessages,
} from "../src/lib/queue";
import { processPastDueBillingAutomation } from "../src/lib/billing";
import { processReminderMessage } from "../src/lib/reminder-runner";
import { prisma } from "../src/lib/prisma";
import log from "../src/lib/logger";

const BILLING_SWEEP_INTERVAL_MS = 15 * 60 * 1000;

async function run(): Promise<void> {
  const once = process.argv.includes("--once");
  let lastBillingSweepAt = 0;

  await ensureReminderQueue();
  log.worker.info("Worker started", { once });

  do {
    const now = Date.now();
    if (once || now - lastBillingSweepAt >= BILLING_SWEEP_INTERVAL_MS) {
      const result = await processPastDueBillingAutomation().catch((err) => {
        log.billing.error("Billing grace automation failed", { error: String(err) });
        return null;
      });
      if (result) {
        log.billing.info("Billing grace automation completed", { result });
      }
      lastBillingSweepAt = now;
    }

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
        log.worker.error("Failed to process reminder message", {
          messageId: msg.MessageId,
          error: error instanceof Error ? error.message : String(error),
        });
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
  log.worker.info("Worker stopped");
}

run().catch(async (error) => {
  log.worker.fatal("Worker crashed", { error: error instanceof Error ? error.message : String(error) });
  await prisma.$disconnect();
  process.exit(1);
});
