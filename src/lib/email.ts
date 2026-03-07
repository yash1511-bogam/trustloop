import { EmailDeliveryStatus, EmailNotificationType } from "@prisma/client";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const globalForResend = globalThis as unknown as {
  resendClient?: Resend;
};

type LoggedEmailInput = {
  workspaceId: string;
  incidentId?: string;
  type: EmailNotificationType;
  toEmail: string;
  subject: string;
  html: string;
  text: string;
};

type LoggedEmailResult = {
  success: boolean;
  providerMessageId?: string;
  error?: string;
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

function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

async function createEmailLog(
  input: Pick<LoggedEmailInput, "workspaceId" | "incidentId" | "type" | "toEmail"> & {
    status: EmailDeliveryStatus;
    providerMessageId?: string;
    errorMessage?: string;
  },
): Promise<void> {
  await prisma.emailNotificationLog.create({
    data: {
      workspaceId: input.workspaceId,
      incidentId: input.incidentId,
      type: input.type,
      toEmail: input.toEmail,
      status: input.status,
      providerMessageId: input.providerMessageId,
      errorMessage: input.errorMessage,
    },
  });
}

async function sendLoggedEmail(input: LoggedEmailInput): Promise<LoggedEmailResult> {
  const client = getResendClient();

  if (!client) {
    const error = "RESEND_API_KEY is not configured.";
    await createEmailLog({
      workspaceId: input.workspaceId,
      incidentId: input.incidentId,
      type: input.type,
      toEmail: input.toEmail,
      status: EmailDeliveryStatus.FAILED,
      errorMessage: error,
    });
    return { success: false, error };
  }

  try {
    const result = await client.emails.send({
      from: senderAddress(),
      to: [input.toEmail],
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    if (result.error?.message) {
      const message = result.error.message.slice(0, 500);
      await createEmailLog({
        workspaceId: input.workspaceId,
        incidentId: input.incidentId,
        type: input.type,
        toEmail: input.toEmail,
        status: EmailDeliveryStatus.FAILED,
        errorMessage: message,
      });

      return { success: false, error: message };
    }

    await createEmailLog({
      workspaceId: input.workspaceId,
      incidentId: input.incidentId,
      type: input.type,
      toEmail: input.toEmail,
      status: EmailDeliveryStatus.SENT,
      providerMessageId: result.data?.id,
    });

    return {
      success: true,
      providerMessageId: result.data?.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Resend send failed.";
    await createEmailLog({
      workspaceId: input.workspaceId,
      incidentId: input.incidentId,
      type: input.type,
      toEmail: input.toEmail,
      status: EmailDeliveryStatus.FAILED,
      errorMessage: message.slice(0, 500),
    });

    return { success: false, error: message };
  }
}

export async function sendReminderEmail(input: {
  workspaceId: string;
  incidentId: string;
  toEmail: string;
  incidentTitle: string;
  incidentStatus: string;
}): Promise<LoggedEmailResult> {
  return sendLoggedEmail({
    workspaceId: input.workspaceId,
    incidentId: input.incidentId,
    type: EmailNotificationType.REMINDER,
    toEmail: input.toEmail,
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
}

export async function sendAuthOtpNoticeEmail(input: {
  workspaceId: string;
  toEmail: string;
  workspaceName: string;
  userName?: string | null;
}): Promise<LoggedEmailResult> {
  const subject = "TrustLoop sign-in code requested";

  return sendLoggedEmail({
    workspaceId: input.workspaceId,
    type: EmailNotificationType.AUTH_OTP,
    toEmail: input.toEmail,
    subject,
    html: [
      `<p>Hi ${input.userName || "there"},</p>`,
      `<p>A one-time verification code was requested for your <strong>${input.workspaceName}</strong> TrustLoop workspace.</p>`,
      "<p>If this was you, use the code from the Stytch email to continue signing in.</p>",
      "<p>If this was not you, ignore this message and rotate access controls for your workspace.</p>",
    ].join(""),
    text: [
      `Hi ${input.userName || "there"},`,
      `A one-time verification code was requested for your ${input.workspaceName} TrustLoop workspace.`,
      "If this was you, use the code from the Stytch email to continue signing in.",
      "If this was not you, ignore this message and rotate access controls for your workspace.",
    ].join("\n"),
  });
}

export async function sendRecoveryInstructionsEmail(input: {
  workspaceId: string;
  toEmail: string;
  workspaceName: string;
  userName?: string | null;
}): Promise<LoggedEmailResult> {
  const baseUrl = appBaseUrl();
  const loginUrl = `${baseUrl}/login`;
  const forgotUrl = `${baseUrl}/forgot-access`;

  return sendLoggedEmail({
    workspaceId: input.workspaceId,
    type: EmailNotificationType.AUTH_RECOVERY,
    toEmail: input.toEmail,
    subject: "TrustLoop account recovery instructions",
    html: [
      `<p>Hi ${input.userName || "there"},</p>`,
      `<p>We received an account recovery request for <strong>${input.workspaceName}</strong>.</p>`,
      "<p>A new sign-in OTP was sent by Stytch. Use it to log in, then review your session security.</p>",
      `<p><a href="${loginUrl}">Open login</a> · <a href="${forgotUrl}">Recovery page</a></p>`,
    ].join(""),
    text: [
      `Hi ${input.userName || "there"},`,
      `We received an account recovery request for ${input.workspaceName}.`,
      "A new sign-in OTP was sent by Stytch. Use it to log in, then review your session security.",
      `Open login: ${loginUrl}`,
      `Recovery page: ${forgotUrl}`,
    ].join("\n"),
  });
}

export async function sendWelcomeEmail(input: {
  workspaceId: string;
  toEmail: string;
  workspaceName: string;
  userName: string;
}): Promise<LoggedEmailResult> {
  const baseUrl = appBaseUrl();

  return sendLoggedEmail({
    workspaceId: input.workspaceId,
    type: EmailNotificationType.ONBOARDING_WELCOME,
    toEmail: input.toEmail,
    subject: "Welcome to TrustLoop",
    html: [
      `<p>Hi ${input.userName},</p>`,
      `<p>Welcome to <strong>${input.workspaceName}</strong> on TrustLoop.</p>`,
      "<p>Your workspace is ready for AI incident operations with triage, ownership tracking, and customer-safe updates.</p>",
      `<p><a href="${baseUrl}/dashboard">Open your dashboard</a></p>`,
    ].join(""),
    text: [
      `Hi ${input.userName},`,
      `Welcome to ${input.workspaceName} on TrustLoop.`,
      "Your workspace is ready for AI incident operations with triage, ownership tracking, and customer-safe updates.",
      `Open your dashboard: ${baseUrl}/dashboard`,
    ].join("\n"),
  });
}

export async function sendGettingStartedGuideEmail(input: {
  workspaceId: string;
  toEmail: string;
  workspaceName: string;
  userName: string;
}): Promise<LoggedEmailResult> {
  const baseUrl = appBaseUrl();

  return sendLoggedEmail({
    workspaceId: input.workspaceId,
    type: EmailNotificationType.ONBOARDING_GUIDE,
    toEmail: input.toEmail,
    subject: "TrustLoop setup guide for your team",
    html: [
      `<p>Hi ${input.userName},</p>`,
      `<p>Here is a quick setup sequence for <strong>${input.workspaceName}</strong>:</p>`,
      "<ol>",
      "<li>Add OpenAI/Gemini/Anthropic API keys in Settings.</li>",
      "<li>Configure workflow routing and model defaults.</li>",
      "<li>Set workspace quotas and rate limits.</li>",
      "<li>Create your first incident and run AI triage.</li>",
      "</ol>",
      `<p><a href="${baseUrl}/settings">Open settings</a> · <a href="${baseUrl}/dashboard">Open dashboard</a></p>`,
    ].join(""),
    text: [
      `Hi ${input.userName},`,
      `Setup sequence for ${input.workspaceName}:`,
      "1) Add OpenAI/Gemini/Anthropic API keys in Settings.",
      "2) Configure workflow routing and model defaults.",
      "3) Set workspace quotas and rate limits.",
      "4) Create your first incident and run AI triage.",
      `Open settings: ${baseUrl}/settings`,
      `Open dashboard: ${baseUrl}/dashboard`,
    ].join("\n"),
  });
}
