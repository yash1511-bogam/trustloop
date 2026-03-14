import { BillingEventProcessStatus, BillingSubscriptionStatus, Prisma, Role } from "@prisma/client";
import DodoPayments from "dodopayments";
import { normalizePlanTier } from "@/lib/billing-plan";
import { applyWorkspacePlan } from "@/lib/billing-plan-server";
import { dodoClient, planForDodoProductId } from "@/lib/dodo";
import {
  sendPaymentConfirmationEmail,
  sendPaymentFailureReminderEmail,
  sendPaymentReceiptEmail,
  sendPlanCanceledEmail,
} from "@/lib/email";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

type DodoWebhookEvent = DodoPayments.Webhooks.UnwrapWebhookEvent;

type Recipient = {
  email: string;
  name: string;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function getString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
}

function parseIsoDate(value: unknown): Date | null {
  const iso = getString(value);
  if (!iso) {
    return null;
  }

  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function statusFromSubscription(input: string | null | undefined): BillingSubscriptionStatus {
  if (input === "active") return BillingSubscriptionStatus.ACTIVE;
  if (input === "pending") return BillingSubscriptionStatus.PENDING;
  if (input === "on_hold") return BillingSubscriptionStatus.PAST_DUE;
  if (input === "cancelled" || input === "failed" || input === "expired") {
    return BillingSubscriptionStatus.CANCELED;
  }
  return BillingSubscriptionStatus.NONE;
}

function hoursBetween(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / 3_600_000);
}

function mergeRecipientEmails(recipients: Recipient[], extraEmail?: string | null): string[] {
  const byEmail = new Map<string, string>();

  for (const recipient of recipients) {
    const normalized = recipient.email.trim().toLowerCase();
    if (!normalized) {
      continue;
    }
    if (!byEmail.has(normalized)) {
      byEmail.set(normalized, recipient.email.trim());
    }
  }

  if (extraEmail?.trim()) {
    const normalized = extraEmail.trim().toLowerCase();
    if (!byEmail.has(normalized)) {
      byEmail.set(normalized, extraEmail.trim());
    }
  }

  return [...byEmail.values()];
}

async function workspaceRecipients(workspaceId: string): Promise<Recipient[]> {
  return prisma.user.findMany({
    where: {
      workspaceId,
      role: {
        in: [Role.OWNER, Role.MANAGER],
      },
    },
    select: {
      email: true,
      name: true,
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });
}

async function resolveWorkspaceId(event: DodoWebhookEvent): Promise<string | null> {
  const data = asRecord(event.data);
  const metadata = asRecord(data.metadata);

  const metadataWorkspaceId = getString(metadata.workspaceId) ?? getString(metadata.workspace_id);
  if (metadataWorkspaceId) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: metadataWorkspaceId },
      select: { id: true },
    });
    if (workspace) {
      return workspace.id;
    }
  }

  const subscriptionId = getString(data.subscription_id);
  if (subscriptionId) {
    const billing = await prisma.workspaceBilling.findFirst({
      where: { dodoSubscriptionId: subscriptionId },
      select: { workspaceId: true },
    });
    if (billing) {
      return billing.workspaceId;
    }
  }

  const customer = asRecord(data.customer);
  const customerId = getString(customer.customer_id);
  if (customerId) {
    const billing = await prisma.workspaceBilling.findFirst({
      where: { dodoCustomerId: customerId },
      select: { workspaceId: true },
    });
    if (billing) {
      return billing.workspaceId;
    }
  }

  const checkoutSessionId = getString(data.checkout_session_id);
  if (checkoutSessionId) {
    const billing = await prisma.workspaceBilling.findFirst({
      where: { dodoCheckoutSessionId: checkoutSessionId },
      select: { workspaceId: true },
    });
    if (billing) {
      return billing.workspaceId;
    }
  }

  return null;
}

export async function processDodoWebhookEvent(input: {
  event: DodoWebhookEvent;
  eventId: string | null;
}): Promise<{
  status: "processed" | "ignored" | "duplicate";
  workspaceId?: string;
  reason?: string;
}> {
  log.billing.info("Processing Dodo webhook event", {
    eventId: input.eventId,
    eventType: input.event.type,
  });

  const workspaceId = await resolveWorkspaceId(input.event);
  if (!workspaceId) {
    log.billing.warn("Ignoring Dodo webhook: workspace unresolved", {
      eventId: input.eventId,
      eventType: input.event.type,
    });
    return { status: "ignored", reason: "workspace_not_resolved" };
  }

  const data = asRecord(input.event.data);
  const metadata = asRecord(data.metadata);
  const customer = asRecord(data.customer);

  const customerId = getString(customer.customer_id);
  const customerEmail = getString(customer.email);
  const subscriptionId = getString(data.subscription_id);
  const paymentId = getString(data.payment_id);
  const amount = typeof data.total_amount === "number" ? data.total_amount : null;
  const currency = getString(data.currency);
  const invoiceUrl = getString(data.invoice_url);
  const checkoutSessionId = getString(data.checkout_session_id);
  const productId = getString(data.product_id) ?? getString(data.new_product_id);
  const subscriptionStatus = getString(data.status);
  const nextBillingDate = parseIsoDate(data.next_billing_date);
  const previousBillingDate = parseIsoDate(data.previous_billing_date);
  const eventCreatedAt = parseIsoDate(input.event.timestamp);
  const planHint = (() => {
    const metadataPlan = getString(metadata.plan);
    if (metadataPlan) {
      return normalizePlanTier(metadataPlan);
    }
    return planForDodoProductId(productId);
  })();

  if (input.eventId) {
    // Skip the separate findUnique check — rely on the unique constraint below
    // to handle deduplication atomically and avoid race conditions.
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      planTier: true,
    },
  });
  if (!workspace) {
    log.billing.warn("Ignoring Dodo webhook: workspace missing", {
      workspaceId,
      eventId: input.eventId,
      eventType: input.event.type,
    });
    return { status: "ignored", reason: "workspace_missing" };
  }

  const recipients = await workspaceRecipients(workspaceId);
  const primaryRecipientEmails = mergeRecipientEmails(recipients, customerEmail);
  const currentPlanTier = normalizePlanTier(workspace.planTier);

  const billingBefore = await prisma.workspaceBilling.upsert({
    where: { workspaceId },
    create: { workspaceId },
    update: {},
  });

  try {
    await prisma.billingEventLog.create({
      data: {
        workspaceId,
        workspaceBillingId: billingBefore.id,
        eventId: input.eventId,
        eventType: input.event.type,
        providerEventCreatedAt: eventCreatedAt,
        paymentId,
        subscriptionId,
        amount,
        currency,
        processStatus: BillingEventProcessStatus.PROCESSED,
        payloadJson: JSON.stringify(input.event),
      },
    });
  } catch (error) {
    if (
      input.eventId &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      log.billing.info("Skipping duplicate Dodo webhook event (race)", {
        workspaceId,
        eventId: input.eventId,
        eventType: input.event.type,
      });
      return { status: "duplicate", workspaceId };
    }
    throw error;
  }

  let shouldSendPaymentConfirmation = false;
  let shouldSendPaymentReceipt = false;
  let shouldSendFailureReminder = false;
  let shouldSendPlanCanceled = false;

  if (input.event.type === "payment.succeeded") {
    shouldSendPaymentConfirmation = primaryRecipientEmails.length > 0;
    shouldSendPaymentReceipt = primaryRecipientEmails.length > 0;

    await prisma.workspaceBilling.update({
      where: { workspaceId },
      data: {
        dodoCustomerId: customerId ?? undefined,
        dodoSubscriptionId: subscriptionId ?? undefined,
        dodoProductId: productId ?? undefined,
        dodoCheckoutSessionId: checkoutSessionId ?? undefined,
        status: BillingSubscriptionStatus.ACTIVE,
        currentPeriodStart: previousBillingDate ?? undefined,
        currentPeriodEnd: nextBillingDate ?? undefined,
        lastPaymentId: paymentId ?? undefined,
        lastPaymentAt: eventCreatedAt ?? new Date(),
        lastPaymentAmount: amount ?? undefined,
        lastPaymentCurrency: currency ?? undefined,
        lastInvoiceUrl: invoiceUrl ?? undefined,
        paymentFailedAt: null,
        failureReminderCount: 0,
        lastFailureReminderAt: null,
        canceledAt: null,
        cancelReason: null,
        discountCode: getString(data.discount_code) ?? billingBefore.discountCode ?? undefined,
      },
    });

    if (planHint) {
      await applyWorkspacePlan({
        prisma,
        workspaceId,
        planTier: planHint,
      });
    }
  }

  if (input.event.type === "payment.failed" || input.event.type === "payment.cancelled") {
    const now = new Date();
    const failedAt = billingBefore.paymentFailedAt ?? eventCreatedAt ?? now;
    const shouldNotify =
      !billingBefore.lastFailureReminderAt ||
      hoursBetween(billingBefore.lastFailureReminderAt, now) >= 12;

    await prisma.workspaceBilling.update({
      where: { workspaceId },
      data: {
        dodoCustomerId: customerId ?? undefined,
        dodoSubscriptionId: subscriptionId ?? undefined,
        dodoProductId: productId ?? undefined,
        dodoCheckoutSessionId: checkoutSessionId ?? undefined,
        status: BillingSubscriptionStatus.PAST_DUE,
        paymentFailedAt: failedAt,
        failureReminderCount: shouldNotify
          ? Math.max(1, billingBefore.failureReminderCount + 1)
          : billingBefore.failureReminderCount,
        lastFailureReminderAt: shouldNotify ? now : billingBefore.lastFailureReminderAt,
        lastPaymentId: paymentId ?? billingBefore.lastPaymentId ?? undefined,
      },
    });

    shouldSendFailureReminder = shouldNotify;
  }

  if (
    input.event.type === "subscription.active" ||
    input.event.type === "subscription.renewed" ||
    input.event.type === "subscription.updated" ||
    input.event.type === "subscription.plan_changed"
  ) {
    await prisma.workspaceBilling.update({
      where: { workspaceId },
      data: {
        dodoCustomerId: customerId ?? undefined,
        dodoSubscriptionId: subscriptionId ?? undefined,
        dodoProductId: productId ?? undefined,
        status:
          statusFromSubscription(subscriptionStatus) === BillingSubscriptionStatus.NONE
            ? BillingSubscriptionStatus.ACTIVE
            : statusFromSubscription(subscriptionStatus),
        currentPeriodStart: previousBillingDate ?? undefined,
        currentPeriodEnd: nextBillingDate ?? undefined,
        paymentFailedAt: null,
        failureReminderCount: 0,
        lastFailureReminderAt: null,
        canceledAt: null,
        cancelReason: null,
      },
    });

    if (planHint) {
      await applyWorkspacePlan({
        prisma,
        workspaceId,
        planTier: planHint,
      });
    }
  }

  if (input.event.type === "subscription.on_hold") {
    await prisma.workspaceBilling.update({
      where: { workspaceId },
      data: {
        dodoCustomerId: customerId ?? undefined,
        dodoSubscriptionId: subscriptionId ?? undefined,
        dodoProductId: productId ?? undefined,
        status: BillingSubscriptionStatus.PAST_DUE,
        paymentFailedAt: billingBefore.paymentFailedAt ?? eventCreatedAt ?? new Date(),
      },
    });
  }

  if (
    input.event.type === "subscription.cancelled" ||
    input.event.type === "subscription.expired" ||
    input.event.type === "subscription.failed"
  ) {
    await prisma.workspaceBilling.update({
      where: { workspaceId },
      data: {
        dodoCustomerId: customerId ?? undefined,
        dodoSubscriptionId: subscriptionId ?? undefined,
        dodoProductId: productId ?? undefined,
        status: BillingSubscriptionStatus.CANCELED,
        canceledAt: eventCreatedAt ?? new Date(),
        cancelReason: input.event.type,
      },
    });

    if (currentPlanTier !== "free") {
      await applyWorkspacePlan({
        prisma,
        workspaceId,
        planTier: "free",
      });
      shouldSendPlanCanceled = true;
    }
  }

  if (shouldSendPaymentConfirmation) {
    for (const email of primaryRecipientEmails) {
      try {
        await sendPaymentConfirmationEmail({
          workspaceId,
          toEmail: email,
          workspaceName: workspace.name,
          planTier: planHint ?? currentPlanTier,
          amountCents: amount,
          currency,
        });
      } catch (error) {
        log.billing.error("Payment confirmation email send failed", {
          workspaceId,
          toEmail: email,
          eventType: input.event.type,
          error: errorMessage(error),
        });
      }
    }
  }

  if (shouldSendPaymentReceipt) {
    for (const email of primaryRecipientEmails) {
      try {
        await sendPaymentReceiptEmail({
          workspaceId,
          toEmail: email,
          workspaceName: workspace.name,
          invoiceUrl,
        });
      } catch (error) {
        log.billing.error("Payment receipt email send failed", {
          workspaceId,
          toEmail: email,
          eventType: input.event.type,
          error: errorMessage(error),
        });
      }
    }
  }

  if (shouldSendFailureReminder) {
    for (const email of primaryRecipientEmails) {
      try {
        await sendPaymentFailureReminderEmail({
          workspaceId,
          toEmail: email,
          workspaceName: workspace.name,
          planTier: currentPlanTier,
          hoursSinceFailure: 0,
          cancelAfterHours: 48,
        });
      } catch (error) {
        log.billing.error("Payment failure reminder email send failed", {
          workspaceId,
          toEmail: email,
          eventType: input.event.type,
          error: errorMessage(error),
        });
      }
    }
  }

  if (shouldSendPlanCanceled) {
    for (const email of primaryRecipientEmails) {
      try {
        await sendPlanCanceledEmail({
          workspaceId,
          toEmail: email,
          workspaceName: workspace.name,
          previousPlanTier: currentPlanTier,
          reason: "Subscription canceled by payment provider.",
        });
      } catch (error) {
        log.billing.error("Plan canceled email send failed", {
          workspaceId,
          toEmail: email,
          eventType: input.event.type,
          error: errorMessage(error),
        });
      }
    }
  }

  log.billing.info("Dodo webhook processed", {
    workspaceId,
    eventId: input.eventId,
    eventType: input.event.type,
    shouldSendPaymentConfirmation,
    shouldSendPaymentReceipt,
    shouldSendFailureReminder,
    shouldSendPlanCanceled,
  });
  return { status: "processed", workspaceId };
}

export async function processPastDueBillingAutomation(input?: {
  now?: Date;
}): Promise<{
  checked: number;
  remindersSent: number;
  canceled: number;
}> {
  const now = input?.now ?? new Date();
  log.billing.info("Starting past-due billing automation", { now: now.toISOString() });

  const rows = await prisma.workspaceBilling.findMany({
    where: {
      status: BillingSubscriptionStatus.PAST_DUE,
      paymentFailedAt: { not: null },
    },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          planTier: true,
          users: {
            where: {
              role: { in: [Role.OWNER, Role.MANAGER] },
            },
            select: {
              email: true,
              name: true,
            },
          },
        },
      },
    },
  });

  let remindersSent = 0;
  let canceled = 0;

  for (const row of rows) {
    const failedAt = row.paymentFailedAt;
    if (!failedAt) {
      continue;
    }

    const elapsedHours = hoursBetween(failedAt, now);
    const recipients = row.workspace.users;
    const recipientEmails = mergeRecipientEmails(
      recipients.map((entry) => ({ email: entry.email, name: entry.name })),
      null,
    );
    const currentPlanTier = normalizePlanTier(row.workspace.planTier);

    if (elapsedHours >= 48) {
      if (row.dodoSubscriptionId) {
        try {
          await dodoClient().subscriptions.update(row.dodoSubscriptionId, {
            status: "cancelled",
            cancel_at_next_billing_date: false,
          });
        } catch (error) {
          log.billing.error("Failed to cancel Dodo subscription during grace automation", {
            workspaceId: row.workspaceId,
            subscriptionId: row.dodoSubscriptionId,
            error: errorMessage(error),
          });
        }
      }

      await applyWorkspacePlan({
        prisma,
        workspaceId: row.workspaceId,
        planTier: "free",
      });

      await prisma.workspaceBilling.update({
        where: { workspaceId: row.workspaceId },
        data: {
          status: BillingSubscriptionStatus.CANCELED,
          canceledAt: now,
          cancelReason: "payment_failed_for_48_hours",
        },
      });

      for (const email of recipientEmails) {
        try {
          await sendPlanCanceledEmail({
            workspaceId: row.workspaceId,
            toEmail: email,
            workspaceName: row.workspace.name,
            previousPlanTier: currentPlanTier,
            reason: "Payment was not recovered within 48 hours after failure.",
          });
        } catch (error) {
          log.billing.error("Grace automation plan cancellation email failed", {
            workspaceId: row.workspaceId,
            toEmail: email,
            error: errorMessage(error),
          });
        }
      }

      canceled += 1;
      continue;
    }

    if (
      elapsedHours >= 24 &&
      row.failureReminderCount < 2 &&
      (!row.lastFailureReminderAt || hoursBetween(row.lastFailureReminderAt, now) >= 20)
    ) {
      for (const email of recipientEmails) {
        try {
          await sendPaymentFailureReminderEmail({
            workspaceId: row.workspaceId,
            toEmail: email,
            workspaceName: row.workspace.name,
            planTier: currentPlanTier,
            hoursSinceFailure: elapsedHours,
            cancelAfterHours: 48,
          });
        } catch (error) {
          log.billing.error("Grace automation payment reminder email failed", {
            workspaceId: row.workspaceId,
            toEmail: email,
            hoursSinceFailure: elapsedHours,
            error: errorMessage(error),
          });
        }
      }

      await prisma.workspaceBilling.update({
        where: { workspaceId: row.workspaceId },
        data: {
          failureReminderCount: row.failureReminderCount + 1,
          lastFailureReminderAt: now,
        },
      });

      remindersSent += recipientEmails.length;
    }
  }

  log.billing.info("Completed past-due billing automation", {
    checked: rows.length,
    remindersSent,
    canceled,
  });
  return {
    checked: rows.length,
    remindersSent,
    canceled,
  };
}
