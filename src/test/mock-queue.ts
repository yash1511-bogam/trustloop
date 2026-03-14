/**
 * Mock for @/lib/queue — captures SQS enqueue calls in-memory.
 *
 * Usage:
 *   vi.mock("@/lib/queue", () => import("@/test/mock-queue"));
 */

import { vi } from "vitest";

export type EnqueuedMessage = { payload: unknown; delaySeconds?: number };

export const __enqueuedMessages: EnqueuedMessage[] = [];

export function resetQueue() {
  __enqueuedMessages.length = 0;
}

export const reminderQueueUrl = vi.fn(() => "http://localhost:4566/000000000000/test-queue");
export const ensureReminderQueue = vi.fn(async () => reminderQueueUrl());

export const enqueueReminder = vi.fn(async (payload: unknown, delaySeconds?: number) => {
  __enqueuedMessages.push({ payload, delaySeconds });
});

export const receiveReminderMessages = vi.fn(async () => []);
export const deleteReminderMessage = vi.fn(async () => {});
