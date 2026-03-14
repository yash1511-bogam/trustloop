import { EmailDeliveryStatus, EmailNotificationType } from "@prisma/client";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";

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

// --- Email types that should ALWAYS be sent regardless of subscription ---
const CRITICAL_EMAIL_TYPES = new Set<EmailNotificationType>([
  EmailNotificationType.AUTH_OTP,
  EmailNotificationType.AUTH_RECOVERY,
  EmailNotificationType.PAYMENT_FAILURE_REMINDER,
]);

function isCriticalEmail(type: EmailNotificationType): boolean {
  return CRITICAL_EMAIL_TYPES.has(type);
}

async function isEmailSubscribed(email: string): Promise<boolean> {
  const sub = await prisma.emailSubscription.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { subscribed: true },
  });
  return sub?.subscribed !== false;
}

function unsubscribeUrl(token: string): string {
  return `${appBaseUrl()}/unsubscribe?token=${encodeURIComponent(token)}`;
}

async function getUnsubscribeToken(email: string): Promise<string | null> {
  const sub = await prisma.emailSubscription.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { unsubscribeToken: true },
  });
  return sub?.unsubscribeToken ?? null;
}

function brandedHtml(bodyHtml: string, unsub?: string | null): string {
  const footer = unsub
    ? `<p style="margin-top:32px;padding-top:16px;border-top:1px solid #222;font-size:12px;color:#666;">
        <a href="${unsub}" style="color:#06b6d4;text-decoration:underline;">Unsubscribe</a> from TrustLoop emails
      </p>`
    : "";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#020203;color:#e5e5e5;font-family:Inter,system-ui,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:40px 24px;">
  <div style="margin-bottom:24px;">
    <span style="font-size:20px;font-weight:700;color:#fff;">TrustLoop</span>
  </div>
  <div style="font-size:15px;line-height:1.6;color:#d4d4d4;">
    ${bodyHtml}
  </div>
  <div style="margin-top:40px;font-size:12px;color:#555;">
    <p>© ${new Date().getFullYear()} TrustLoop · AI Incident Operations</p>
    ${footer}
  </div>
</div></body></html>`;
}

function brandedText(bodyText: string, unsub?: string | null): string {
  const footer = unsub ? `\n---\nUnsubscribe: ${unsub}` : "";
  return `${bodyText}\n\n© ${new Date().getFullYear()} TrustLoop · AI Incident Operations${footer}`;
}

export async function upsertEmailSubscription(input: {
  email: string;
  name: string;
  userId?: string;
}): Promise<void> {
  const email = input.email.toLowerCase().trim();
  await prisma.emailSubscription.upsert({
    where: { email },
    create: { email, name: input.name, userId: input.userId },
    update: { name: input.name, ...(input.userId ? { userId: input.userId } : {}) },
  });
}

function isStubEmailDeliveryEnabled(): boolean {
  return process.env.TRUSTLOOP_STUB_EMAIL_DELIVERY === "1";
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
  // Gate non-critical emails on subscription status
  if (!isCriticalEmail(input.type)) {
    const subscribed = await isEmailSubscribed(input.toEmail);
    if (!subscribed) {
      log.app.info("Skipped email to unsubscribed address", { toEmail: input.toEmail, type: input.type });
      return { success: true };
    }
  }

  // Wrap with branding + unsubscribe for non-critical emails
  let html = input.html;
  let text = input.text;
  if (!isCriticalEmail(input.type)) {
    const token = await getUnsubscribeToken(input.toEmail);
    const unsub = token ? unsubscribeUrl(token) : null;
    html = brandedHtml(input.html, unsub);
    text = brandedText(input.text, unsub);
  } else {
    html = brandedHtml(input.html);
    text = brandedText(input.text);
  }

  if (isStubEmailDeliveryEnabled()) {
    const providerMessageId = `stub-${Date.now()}`;
    await createEmailLog({
      workspaceId: input.workspaceId,
      incidentId: input.incidentId,
      type: input.type,
      toEmail: input.toEmail,
      status: EmailDeliveryStatus.SENT,
      providerMessageId,
    });
    return {
      success: true,
      providerMessageId,
    };
  }

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
      html,
      text,
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
      "<p>If this was you, check your inbox for the verification code to continue signing in.</p>",
      "<p>If this was not you, ignore this message and rotate access controls for your workspace.</p>",
    ].join(""),
    text: [
      `Hi ${input.userName || "there"},`,
      `A one-time verification code was requested for your ${input.workspaceName} TrustLoop workspace.`,
      "If this was you, check your inbox for the verification code to continue signing in.",
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

const WELCOME_EMAIL_DELAY_MS = 10 * 60 * 1000;

export function scheduleWelcomeEmail(input: {
  workspaceId: string;
  toEmail: string;
  workspaceName: string;
  userName: string;
}): void {
  setTimeout(() => {
    sendWelcomeEmail(input).catch(() => {});
  }, WELCOME_EMAIL_DELAY_MS);
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

export async function sendOwnerAssignedEmail(input: {
  workspaceId: string;
  incidentId: string;
  toEmail: string;
  ownerName: string;
  incidentTitle: string;
}): Promise<LoggedEmailResult> {
  const baseUrl = appBaseUrl();
  return sendLoggedEmail({
    workspaceId: input.workspaceId,
    incidentId: input.incidentId,
    type: EmailNotificationType.OWNER_ASSIGNED,
    toEmail: input.toEmail,
    subject: `You were assigned: ${input.incidentTitle}`,
    html: [
      `<p>Hi ${input.ownerName},</p>`,
      `<p>You were assigned as incident owner for <strong>${input.incidentTitle}</strong>.</p>`,
      `<p><a href=\"${baseUrl}/dashboard\">Open TrustLoop dashboard</a></p>`,
    ].join(""),
    text: [
      `Hi ${input.ownerName},`,
      `You were assigned as incident owner for ${input.incidentTitle}.`,
      `Open dashboard: ${baseUrl}/dashboard`,
    ].join("\n"),
  });
}

export async function sendCustomerUpdateEmail(input: {
  workspaceId: string;
  incidentId: string;
  toEmail: string;
  customerName?: string | null;
  incidentTitle: string;
  body: string;
}): Promise<LoggedEmailResult> {
  const greeting = input.customerName?.trim() ? `Hi ${input.customerName.trim()},` : "Hello,";

  return sendLoggedEmail({
    workspaceId: input.workspaceId,
    incidentId: input.incidentId,
    type: EmailNotificationType.CUSTOMER_UPDATE,
    toEmail: input.toEmail,
    subject: `Update: ${input.incidentTitle}`,
    html: [
      `<p>${greeting}</p>`,
      `<p>We have an update regarding <strong>${input.incidentTitle}</strong>.</p>`,
      `<p>${input.body.replace(/\n/g, "<br />")}</p>`,
      "<p>We will continue sharing updates as we make progress.</p>",
    ].join(""),
    text: [
      greeting,
      "",
      `We have an update regarding ${input.incidentTitle}.`,
      "",
      input.body,
      "",
      "We will continue sharing updates as we make progress.",
    ].join("\n"),
  });
}

export async function sendWorkspaceInviteEmail(input: {
  workspaceId: string;
  toEmail: string;
  inviterName: string;
  workspaceName: string;
  role: string;
  joinUrl: string;
}): Promise<LoggedEmailResult> {
  return sendLoggedEmail({
    workspaceId: input.workspaceId,
    type: EmailNotificationType.WORKSPACE_INVITE,
    toEmail: input.toEmail,
    subject: `You are invited to ${input.workspaceName} on TrustLoop`,
    html: [
      `<p>${input.inviterName} invited you to join <strong>${input.workspaceName}</strong> on TrustLoop as <strong>${input.role}</strong>.</p>`,
      `<p><a href=\"${input.joinUrl}\">Accept invite</a></p>`,
    ].join(""),
    text: [
      `${input.inviterName} invited you to join ${input.workspaceName} on TrustLoop as ${input.role}.`,
      `Accept invite: ${input.joinUrl}`,
    ].join("\n"),
  });
}

export async function sendAiKeyHealthAlertEmail(input: {
  workspaceId: string;
  toEmail: string;
  provider: string;
  detail: string;
}): Promise<LoggedEmailResult> {
  return sendLoggedEmail({
    workspaceId: input.workspaceId,
    type: EmailNotificationType.INCIDENT_ALERT,
    toEmail: input.toEmail,
    subject: `${input.provider} API key verification failed`,
    html: [
      `<p>TrustLoop could not verify your <strong>${input.provider}</strong> API key.</p>`,
      `<p>${input.detail}</p>`,
      "<p>Update the key in Settings to restore AI triage and customer update workflows.</p>",
    ].join(""),
    text: [
      `TrustLoop could not verify your ${input.provider} API key.`,
      input.detail,
      "Update the key in Settings to restore AI workflows.",
    ].join("\n"),
  });
}

export async function sendPaymentConfirmationEmail(input: {
  workspaceId: string;
  toEmail: string;
  workspaceName: string;
  planTier: string;
  amountCents?: number | null;
  currency?: string | null;
}): Promise<LoggedEmailResult> {
  const amountText =
    typeof input.amountCents === "number" && input.amountCents > 0
      ? `${(input.amountCents / 100).toFixed(2)} ${input.currency ?? "USD"}`
      : "as invoiced";

  return sendLoggedEmail({
    workspaceId: input.workspaceId,
    type: EmailNotificationType.PAYMENT_CONFIRMATION,
    toEmail: input.toEmail,
    subject: `TrustLoop payment confirmed (${input.planTier})`,
    html: [
      `<p>Your TrustLoop payment for <strong>${input.workspaceName}</strong> was successful.</p>`,
      `<p><strong>Plan:</strong> ${input.planTier}</p>`,
      `<p><strong>Amount:</strong> ${amountText}</p>`,
      "<p>Your subscription remains active.</p>",
    ].join(""),
    text: [
      `Your TrustLoop payment for ${input.workspaceName} was successful.`,
      `Plan: ${input.planTier}`,
      `Amount: ${amountText}`,
      "Your subscription remains active.",
    ].join("\n"),
  });
}

export async function sendPaymentReceiptEmail(input: {
  workspaceId: string;
  toEmail: string;
  workspaceName: string;
  invoiceUrl?: string | null;
}): Promise<LoggedEmailResult> {
  return sendLoggedEmail({
    workspaceId: input.workspaceId,
    type: EmailNotificationType.PAYMENT_RECEIPT,
    toEmail: input.toEmail,
    subject: `TrustLoop receipt for ${input.workspaceName}`,
    html: [
      `<p>Your payment receipt for <strong>${input.workspaceName}</strong> is ready.</p>`,
      input.invoiceUrl
        ? `<p><a href="${input.invoiceUrl}">Download invoice/receipt</a></p>`
        : "<p>Invoice URL is not available in this event. You can access billing documents from your payment provider portal.</p>",
    ].join(""),
    text: [
      `Your payment receipt for ${input.workspaceName} is ready.`,
      input.invoiceUrl
        ? `Download invoice/receipt: ${input.invoiceUrl}`
        : "Invoice URL is not available in this event.",
    ].join("\n"),
  });
}

export async function sendPaymentFailureReminderEmail(input: {
  workspaceId: string;
  toEmail: string;
  workspaceName: string;
  planTier: string;
  hoursSinceFailure: number;
  cancelAfterHours: number;
}): Promise<LoggedEmailResult> {
  const remaining = Math.max(0, input.cancelAfterHours - input.hoursSinceFailure);
  const settingsUrl = `${appBaseUrl()}/settings`;

  return sendLoggedEmail({
    workspaceId: input.workspaceId,
    type: EmailNotificationType.PAYMENT_FAILURE_REMINDER,
    toEmail: input.toEmail,
    subject: `Payment failed for ${input.workspaceName} (${input.planTier})`,
    html: [
      `<p>We couldn't process the latest payment for <strong>${input.workspaceName}</strong> on plan <strong>${input.planTier}</strong>.</p>`,
      `<p>If billing is not fixed within ${input.cancelAfterHours} hours of failure, TrustLoop will downgrade this workspace to Free automatically.</p>`,
      `<p><strong>Time remaining:</strong> approximately ${remaining} hours.</p>`,
      `<p><a href="${settingsUrl}">Open billing settings</a></p>`,
    ].join(""),
    text: [
      `We couldn't process the latest payment for ${input.workspaceName} on ${input.planTier}.`,
      `If billing is not fixed within ${input.cancelAfterHours} hours, the workspace will downgrade to Free automatically.`,
      `Time remaining: approximately ${remaining} hours.`,
      `Open billing settings: ${settingsUrl}`,
    ].join("\n"),
  });
}

export async function sendPlanCanceledEmail(input: {
  workspaceId: string;
  toEmail: string;
  workspaceName: string;
  previousPlanTier: string;
  reason: string;
}): Promise<LoggedEmailResult> {
  const settingsUrl = `${appBaseUrl()}/settings`;

  return sendLoggedEmail({
    workspaceId: input.workspaceId,
    type: EmailNotificationType.PLAN_CANCELED,
    toEmail: input.toEmail,
    subject: `TrustLoop plan downgraded to Free`,
    html: [
      `<p><strong>${input.workspaceName}</strong> has been downgraded from <strong>${input.previousPlanTier}</strong> to <strong>free</strong>.</p>`,
      `<p><strong>Reason:</strong> ${input.reason}</p>`,
      `<p><a href="${settingsUrl}">Open billing settings</a></p>`,
    ].join(""),
    text: [
      `${input.workspaceName} has been downgraded from ${input.previousPlanTier} to free.`,
      `Reason: ${input.reason}`,
      `Open billing settings: ${settingsUrl}`,
    ].join("\n"),
  });
}

export async function sendTrialStartedEmail(input: {
  workspaceId: string;
  toEmail: string;
  workspaceName: string;
  userName: string;
  planTier: string;
  trialEndsAt: Date;
}): Promise<LoggedEmailResult> {
  const baseUrl = appBaseUrl();
  const endsFormatted = input.trialEndsAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return sendLoggedEmail({
    workspaceId: input.workspaceId,
    type: EmailNotificationType.TRIAL_STARTED,
    toEmail: input.toEmail,
    subject: `Your 14-day ${input.planTier} trial has started`,
    html: [
      `<p>Hi ${input.userName},</p>`,
      `<p>Your 14-day free trial of the <strong>${input.planTier}</strong> plan for <strong>${input.workspaceName}</strong> is now active.</p>`,
      `<p>You have full access to all ${input.planTier} features until <strong>${endsFormatted}</strong>.</p>`,
      "<p>No charges will be made during the trial. Add a payment method before the trial ends to continue uninterrupted.</p>",
      `<p><a href="${baseUrl}/settings/billing">Set up billing</a> · <a href="${baseUrl}/dashboard">Open dashboard</a></p>`,
    ].join(""),
    text: [
      `Hi ${input.userName},`,
      `Your 14-day free trial of the ${input.planTier} plan for ${input.workspaceName} is now active.`,
      `You have full access until ${endsFormatted}.`,
      "No charges during the trial. Add a payment method before it ends to continue.",
      `Set up billing: ${baseUrl}/settings/billing`,
    ].join("\n"),
  });
}

export async function sendTrialReminderEmail(input: {
  workspaceId: string;
  toEmail: string;
  workspaceName: string;
  planTier: string;
  daysRemaining: number;
}): Promise<LoggedEmailResult> {
  const baseUrl = appBaseUrl();
  const urgency = input.daysRemaining <= 1 ? "expires tomorrow" : `expires in ${input.daysRemaining} days`;

  return sendLoggedEmail({
    workspaceId: input.workspaceId,
    type: EmailNotificationType.TRIAL_REMINDER,
    toEmail: input.toEmail,
    subject: `Your TrustLoop trial ${urgency}`,
    html: [
      `<p>Your <strong>${input.planTier}</strong> trial for <strong>${input.workspaceName}</strong> ${urgency}.</p>`,
      "<p>Subscribe now to keep your current plan features and quotas. Without a subscription, your workspace will be downgraded to Free.</p>",
      `<p><a href="${baseUrl}/settings/billing">Subscribe now</a></p>`,
    ].join(""),
    text: [
      `Your ${input.planTier} trial for ${input.workspaceName} ${urgency}.`,
      "Subscribe now to keep your plan features. Without a subscription, you'll be downgraded to Free.",
      `Subscribe: ${baseUrl}/settings/billing`,
    ].join("\n"),
  });
}

export async function sendTrialExpiredEmail(input: {
  workspaceId: string;
  toEmail: string;
  workspaceName: string;
  previousPlanTier: string;
}): Promise<LoggedEmailResult> {
  const baseUrl = appBaseUrl();

  return sendLoggedEmail({
    workspaceId: input.workspaceId,
    type: EmailNotificationType.TRIAL_EXPIRED,
    toEmail: input.toEmail,
    subject: "Your TrustLoop trial has ended",
    html: [
      `<p>The <strong>${input.previousPlanTier}</strong> trial for <strong>${input.workspaceName}</strong> has expired.</p>`,
      "<p>Your workspace has been downgraded to the <strong>Free</strong> plan. Subscribe anytime to restore your previous plan and quotas.</p>",
      `<p><a href="${baseUrl}/settings/billing">Choose a plan</a></p>`,
    ].join(""),
    text: [
      `The ${input.previousPlanTier} trial for ${input.workspaceName} has expired.`,
      "Your workspace has been downgraded to Free. Subscribe anytime to restore your plan.",
      `Choose a plan: ${baseUrl}/settings/billing`,
    ].join("\n"),
  });
}

/**
 * Send an early access invite email with the user's invite code.
 * This is NOT auto-sent — call it manually via the seed script or admin action.
 */
export async function sendEarlyAccessInviteEmail(input: {
  toEmail: string;
  userName: string;
  inviteCode: string;
}): Promise<LoggedEmailResult> {
  const baseUrl = appBaseUrl();
  const registerLink = `${baseUrl}/register?invite_code=${encodeURIComponent(input.inviteCode)}`;

  return sendLoggedEmail({
    workspaceId: "system",
    type: EmailNotificationType.EARLY_ACCESS_INVITE,
    toEmail: input.toEmail,
    subject: "Your TrustLoop invite code is ready",
    html: [
      `<p>Hi ${input.userName},</p>`,
      "<p>Your early access request has been approved! Use the link below to create your TrustLoop workspace — your invite code will be filled in automatically.</p>",
      `<p style="text-align:center;margin:24px 0;"><a href="${registerLink}" style="display:inline-block;padding:12px 32px;background:#06b6d4;color:#fff;font-weight:bold;border-radius:8px;text-decoration:none;">Create your workspace</a></p>`,
      `<p>Or enter this invite code manually on the <a href="${baseUrl}/register">registration page</a>:</p>`,
      `<p style="font-size:24px;font-weight:bold;letter-spacing:2px;padding:16px;background:#111;border-radius:8px;text-align:center;color:#fff;">${input.inviteCode}</p>`,
      "<p>This code is single-use and tied to your email. Once you register, it cannot be reused.</p>",
    ].join(""),
    text: [
      `Hi ${input.userName},`,
      "Your early access request has been approved!",
      `Register here (invite code auto-filled): ${registerLink}`,
      "",
      `Or enter this code manually: ${input.inviteCode}`,
      `Registration page: ${baseUrl}/register`,
      "This code is single-use and tied to your email.",
    ].join("\n"),
  });
}

export async function sendEarlyAccessConfirmationEmail(input: {
  toEmail: string;
  userName: string;
}): Promise<LoggedEmailResult> {
  return sendLoggedEmail({
    workspaceId: "system",
    type: EmailNotificationType.EARLY_ACCESS_CONFIRMATION,
    toEmail: input.toEmail,
    subject: "Welcome to the TrustLoop waitlist",
    html: [
      `<p>Hi ${input.userName},</p>`,
      "<p>Thank you for signing up for early access to TrustLoop. Your spot on the waitlist is confirmed.</p>",
      "<p>We're onboarding teams in small batches to ensure the best experience. When your invite is ready, we'll send you a personal invite code to create your workspace.</p>",
      "<p>In the meantime, feel free to reply to this email if you have any questions.</p>",
      "<p>— The TrustLoop Team</p>",
    ].join(""),
    text: [
      `Hi ${input.userName},`,
      "",
      "Thank you for signing up for early access to TrustLoop. Your spot on the waitlist is confirmed.",
      "",
      "We're onboarding teams in small batches to ensure the best experience. When your invite is ready, we'll send you a personal invite code to create your workspace.",
      "",
      "In the meantime, feel free to reply to this email if you have any questions.",
      "",
      "— The TrustLoop Team",
    ].join("\n"),
  });
}

export async function sendEarlyAccessOtpEmail(input: {
  toEmail: string;
  code: string;
}): Promise<LoggedEmailResult> {
  return sendLoggedEmail({
    workspaceId: "system",
    type: EmailNotificationType.EARLY_ACCESS_CONFIRMATION,
    toEmail: input.toEmail,
    subject: `${input.code} is your TrustLoop verification code`,
    html: [
      "<p>Hi,</p>",
      "<p>Use the code below to verify your email for TrustLoop early access:</p>",
      `<p style="font-size:32px;font-weight:bold;letter-spacing:4px;padding:16px;background:#111;border-radius:8px;text-align:center;color:#fff;">${input.code}</p>`,
      "<p>This code expires in 15 minutes.</p>",
      "<p>If you didn't request this, you can safely ignore this email.</p>",
    ].join(""),
    text: [
      "Hi,",
      "",
      "Use this code to verify your email for TrustLoop early access:",
      "",
      input.code,
      "",
      "This code expires in 15 minutes.",
      "If you didn't request this, you can safely ignore this email.",
    ].join("\n"),
  });
}
