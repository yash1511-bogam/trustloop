
import { EmailDeliveryStatus, EmailNotificationType } from "@prisma/client";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const globalForResend = globalThis as unknown as {
  resendClient?: Resend;
};

function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return null;
  }

  if (globalForResend.resendClient) {
    return globalForResend.resendClient;
  }

  const client = new Resend(key);
  if (process.env.NODE_ENV !== "production") {
    globalForResend.resendClient = client;
  }
  return client;
}

function senderAddress(): string {
  return process.env.RESEND_FROM_EMAIL ?? "TrustLoop <onboarding@resend.dev>";
}

export async function sendReminderEmail(input: {
  workspaceId: string;
  incidentId: string;
  toEmail: string;
  incidentTitle: string;
  incidentStatus: string;
}): Promise<{ success: boolean; providerMessageId?: string; error?: string }> {
  const client = getResendClient();

  if (!client) {
    const error = "RESEND_API_KEY is not configured.";
    await prisma.emailNotificationLog.create({
      data: {
        workspaceId: input.workspaceId,
        incidentId: input.incidentId,
        type: EmailNotificationType.REMINDER,
        toEmail: input.toEmail,
        status: EmailDeliveryStatus.FAILED,
        errorMessage: error,
      },
    });
    return { success: false, error };
  }

  try {
    const result = await client.emails.send({
      from: senderAddress(),
      to: [input.toEmail],
      subject: `Reminder: ${input.incidentTitle}`,
      html: [
        "<p>This is an automated TrustLoop incident reminder.</p>",
        `<p><strong>Incident:</strong> ${input.incidentTitle}</p>`,
        `<p><strong>Status:</strong> ${input.incidentStatus}</p>`,
        "<p>Please review owner actions and publish the next customer update.</p>",
      ].join(""),
      text: [
        "This is an automated TrustLoop incident reminder.",
        `Incident: ${input.incidentTitle}`,
        `Status: ${input.incidentStatus}`,
        "Please review owner actions and publish the next customer update.",
      ].join("\n"),
    });

    const errorMessage = result.error?.message;
    if (errorMessage) {
      await prisma.emailNotificationLog.create({
        data: {
          workspaceId: input.workspaceId,
          incidentId: input.incidentId,
          type: EmailNotificationType.REMINDER,
          toEmail: input.toEmail,
          status: EmailDeliveryStatus.FAILED,
          errorMessage: errorMessage.slice(0, 500),
        },
      });

      return {
        success: false,
        error: errorMessage,
      };
    }

    await prisma.emailNotificationLog.create({
      data: {
        workspaceId: input.workspaceId,
        incidentId: input.incidentId,
        type: EmailNotificationType.REMINDER,
        toEmail: input.toEmail,
        status: EmailDeliveryStatus.SENT,
        providerMessageId: result.data?.id,
      },
    });

    return {
      success: true,
      providerMessageId: result.data?.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Resend send failed.";

    await prisma.emailNotificationLog.create({
      data: {
        workspaceId: input.workspaceId,
        incidentId: input.incidentId,
        type: EmailNotificationType.REMINDER,
        toEmail: input.toEmail,
        status: EmailDeliveryStatus.FAILED,
        errorMessage: message.slice(0, 500),
      },
    });

    return { success: false, error: message };
  }
}
