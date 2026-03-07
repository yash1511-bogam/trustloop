import "server-only";

import {
  CreateQueueCommand,
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  SQSClient,
  type Message,
} from "@aws-sdk/client-sqs";
import { REMINDER_QUEUE_NAME } from "@/lib/constants";

const region = process.env.AWS_REGION ?? "us-east-1";
const endpoint = process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566";

function client(): SQSClient {
  return new SQSClient({
    region,
    endpoint,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "test",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "test",
    },
  });
}

export function reminderQueueUrl(): string {
  return (
    process.env.REMINDER_QUEUE_URL ??
    `${endpoint}/000000000000/${REMINDER_QUEUE_NAME}`
  );
}

export async function ensureReminderQueue(): Promise<string> {
  const sqs = client();
  const response = await sqs.send(
    new CreateQueueCommand({
      QueueName: REMINDER_QUEUE_NAME,
    }),
  );

  return response.QueueUrl ?? reminderQueueUrl();
}

export type ReminderMessagePayload = {
  workspaceId: string;
  incidentId: string;
  queuedAt: string;
};

export async function enqueueReminder(
  payload: ReminderMessagePayload,
): Promise<string | undefined> {
  const sqs = client();
  const response = await sqs.send(
    new SendMessageCommand({
      QueueUrl: reminderQueueUrl(),
      MessageBody: JSON.stringify(payload),
    }),
  );

  return response.MessageId;
}

export async function receiveReminderMessages(
  maxNumber = 10,
): Promise<Message[]> {
  const sqs = client();
  const response = await sqs.send(
    new ReceiveMessageCommand({
      QueueUrl: reminderQueueUrl(),
      MaxNumberOfMessages: maxNumber,
      WaitTimeSeconds: 10,
      VisibilityTimeout: 30,
    }),
  );

  return response.Messages ?? [];
}

export async function deleteReminderMessage(receiptHandle: string): Promise<void> {
  const sqs = client();
  await sqs.send(
    new DeleteMessageCommand({
      QueueUrl: reminderQueueUrl(),
      ReceiptHandle: receiptHandle,
    }),
  );
}
