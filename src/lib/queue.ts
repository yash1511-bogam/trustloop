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

function sqsEndpoint(): string | undefined {
  return process.env.AWS_ENDPOINT_URL;
}

function normalizeEndpoint(endpoint: string): string {
  return endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;
}

function isLocalEndpoint(endpoint: string): boolean {
  try {
    const host = new URL(endpoint).hostname.toLowerCase();
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "localstack" ||
      host.endsWith(".localhost.localstack.cloud")
    );
  } catch {
    return false;
  }
}

function localQueueUrl(endpoint: string): string {
  return `${normalizeEndpoint(endpoint)}/000000000000/${REMINDER_QUEUE_NAME}`;
}

function sqsCredentials(): { accessKeyId: string; secretAccessKey: string } | undefined {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    return {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  }

  if (sqsEndpoint()) {
    return {
      accessKeyId: "test",
      secretAccessKey: "test",
    };
  }

  return undefined;
}

function client(): SQSClient {
  return new SQSClient({
    region,
    endpoint: sqsEndpoint(),
    credentials: sqsCredentials(),
  });
}

export function reminderQueueUrl(): string {
  const endpoint = sqsEndpoint();
  if (endpoint && isLocalEndpoint(endpoint)) {
    return localQueueUrl(endpoint);
  }

  if (process.env.REMINDER_QUEUE_URL) {
    return process.env.REMINDER_QUEUE_URL;
  }

  if (endpoint) {
    return localQueueUrl(endpoint);
  }

  return `https://sqs.${region}.amazonaws.com/${process.env.AWS_ACCOUNT_ID ?? "000000000000"}/${REMINDER_QUEUE_NAME}`;
}

export async function ensureReminderQueue(): Promise<string> {
  const sqs = client();
  const response = await sqs.send(
    new CreateQueueCommand({
      QueueName: REMINDER_QUEUE_NAME,
    }),
  );
  const queueUrl = response.QueueUrl ?? reminderQueueUrl();
  process.env.REMINDER_QUEUE_URL = queueUrl;
  return queueUrl;
}

export type ReminderMessagePayload = {
  workspaceId: string;
  incidentId: string;
  queuedAt: string;
  dueAt?: string;
  delaySeconds?: number;
};

export async function enqueueReminder(
  payload: ReminderMessagePayload,
): Promise<string | undefined> {
  const delaySeconds =
    payload.delaySeconds !== undefined
      ? Math.max(0, Math.min(900, Math.floor(payload.delaySeconds)))
      : 0;

  const sqs = client();
  const response = await sqs.send(
    new SendMessageCommand({
      QueueUrl: reminderQueueUrl(),
      MessageBody: JSON.stringify(payload),
      DelaySeconds: delaySeconds,
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
