/**
 * Mock for @/lib/email — captures all sent emails in-memory.
 *
 * Usage:
 *   vi.mock("@/lib/email", () => import("@/test/mock-email"));
 *
 * Then inspect:
 *   import { __sentEmails, resetEmails } from "@/test/mock-email";
 */

import { vi } from "vitest";

export type SentEmail = {
  fn: string;
  input: Record<string, unknown>;
};

export const __sentEmails: SentEmail[] = [];

export function resetEmails() {
  __sentEmails.length = 0;
}

function makeMock(name: string) {
  return vi.fn(async (input: Record<string, unknown>) => {
    __sentEmails.push({ fn: name, input });
    return { success: true };
  });
}

export const sendReminderEmail = makeMock("sendReminderEmail");
export const sendAuthOtpNoticeEmail = makeMock("sendAuthOtpNoticeEmail");
export const sendRecoveryInstructionsEmail = makeMock("sendRecoveryInstructionsEmail");
export const sendWelcomeEmail = makeMock("sendWelcomeEmail");
export const sendGettingStartedGuideEmail = makeMock("sendGettingStartedGuideEmail");
export const sendOwnerAssignedEmail = makeMock("sendOwnerAssignedEmail");
export const sendCustomerUpdateEmail = makeMock("sendCustomerUpdateEmail");
export const sendWorkspaceInviteEmail = makeMock("sendWorkspaceInviteEmail");
export const sendAiKeyHealthAlertEmail = makeMock("sendAiKeyHealthAlertEmail");
export const sendPaymentConfirmationEmail = makeMock("sendPaymentConfirmationEmail");
export const sendPaymentReceiptEmail = makeMock("sendPaymentReceiptEmail");
export const sendPaymentFailureReminderEmail = makeMock("sendPaymentFailureReminderEmail");
export const sendPlanCanceledEmail = makeMock("sendPlanCanceledEmail");
export const sendTrialStartedEmail = makeMock("sendTrialStartedEmail");
export const sendTrialReminderEmail = makeMock("sendTrialReminderEmail");
export const sendTrialExpiredEmail = makeMock("sendTrialExpiredEmail");
export const sendEarlyAccessConfirmationEmail = makeMock("sendEarlyAccessConfirmationEmail");
