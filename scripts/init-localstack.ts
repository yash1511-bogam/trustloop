import "dotenv/config";
import { ensureReminderQueue, reminderQueueUrl } from "../src/lib/queue";

async function main(): Promise<void> {
  const queueUrl = await ensureReminderQueue();
  console.log("Reminder queue ready:", queueUrl || reminderQueueUrl());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
