import { processReminderPayload, type ReminderPayload } from "@/lib/reminder-runner";

type SQSRecord = {
  messageId?: string;
  body: string;
};

type SQSEvent = {
  Records: SQSRecord[];
};

export async function handler(event: SQSEvent): Promise<void> {
  for (const record of event.Records) {
    const payload = JSON.parse(record.body) as ReminderPayload;
    await processReminderPayload({
      payload,
      messageId: record.messageId,
    });
  }
}
