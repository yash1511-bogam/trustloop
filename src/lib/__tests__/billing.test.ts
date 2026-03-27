import { describe, it, expect, vi, beforeEach } from "vitest";
import { BillingSubscriptionStatus } from "@prisma/client";

vi.mock("@/lib/prisma", () => {
  const mockPrisma = {
    workspace: { findUnique: vi.fn() },
    workspaceBilling: { findFirst: vi.fn(), upsert: vi.fn(), update: vi.fn() },
    billingEventLog: { create: vi.fn() },
    user: { findMany: vi.fn() },
  };
  return { prisma: mockPrisma };
});

vi.mock("@/lib/billing-plan", () => ({
  normalizePlanTier: vi.fn((t: string) => t?.toLowerCase() ?? "starter"),
}));

vi.mock("@/lib/billing-plan-server", () => ({
  applyWorkspacePlan: vi.fn(async () => {}),
}));

vi.mock("@/lib/dodo", () => ({
  dodoClient: vi.fn(() => ({ subscriptions: { update: vi.fn() } })),
  planForDodoProductId: vi.fn(() => "pro"),
}));

vi.mock("@/lib/email", () => ({
  sendPaymentConfirmationEmail: vi.fn(async () => {}),
  sendPaymentReceiptEmail: vi.fn(async () => {}),
  sendPaymentFailureReminderEmail: vi.fn(async () => {}),
  sendPlanCanceledEmail: vi.fn(async () => {}),
}));

vi.mock("@/lib/logger", () => ({
  log: {
    billing: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { applyWorkspacePlan } from "@/lib/billing-plan-server";
import {
  sendPaymentConfirmationEmail,
  sendPaymentFailureReminderEmail,
  sendPlanCanceledEmail,
} from "@/lib/email";

const WORKSPACE = { id: "ws-1", name: "Test Co", planTier: "pro" };
const BILLING_ROW = {
  id: "bill-1",
  workspaceId: "ws-1",
  dodoCustomerId: "cust_1",
  dodoSubscriptionId: "sub_1",
  dodoProductId: null,
  dodoCheckoutSessionId: null,
  discountCode: null,
  paymentFailedAt: null,
  failureReminderCount: 0,
  lastFailureReminderAt: null,
  lastPaymentId: null,
};

function makeEvent(type: string, data: Record<string, unknown> = {}) {
  return {
    type,
    timestamp: new Date().toISOString(),
    data: {
      subscription_id: "sub_1",
      customer: { customer_id: "cust_1", email: "owner@test.co" },
      metadata: { workspaceId: "ws-1", plan: "pro" },
      ...data,
    },
  };
}

function setupMocks(billingOverrides: Record<string, unknown> = {}) {
  vi.mocked(prisma.workspace.findUnique).mockResolvedValue(WORKSPACE as never);
  vi.mocked(prisma.workspaceBilling.upsert).mockResolvedValue({ ...BILLING_ROW, ...billingOverrides } as never);
  vi.mocked(prisma.workspaceBilling.update).mockResolvedValue({} as never);
  vi.mocked(prisma.billingEventLog.create).mockResolvedValue({} as never);
  vi.mocked(prisma.user.findMany).mockResolvedValue([{ email: "owner@test.co", name: "Owner" }] as never);
}

describe("processDodoWebhookEvent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("payment.succeeded upgrades plan and sends confirmation", async () => {
    setupMocks();
    const { processDodoWebhookEvent } = await import("@/lib/billing");

    const result = await processDodoWebhookEvent({
      event: makeEvent("payment.succeeded", { total_amount: 2900, currency: "USD" }) as never,
      eventId: "evt_pay_1",
    });

    expect(result.status).toBe("processed");
    expect(result.workspaceId).toBe("ws-1");
    expect(vi.mocked(prisma.workspaceBilling.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: BillingSubscriptionStatus.ACTIVE }),
      }),
    );
    expect(vi.mocked(applyWorkspacePlan)).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: "ws-1", planTier: "pro" }),
    );
    expect(vi.mocked(sendPaymentConfirmationEmail)).toHaveBeenCalled();
  });

  it("payment.failed sets PAST_DUE and sends failure reminder", async () => {
    setupMocks();
    const { processDodoWebhookEvent } = await import("@/lib/billing");

    const result = await processDodoWebhookEvent({
      event: makeEvent("payment.failed") as never,
      eventId: "evt_fail_1",
    });

    expect(result.status).toBe("processed");
    expect(vi.mocked(prisma.workspaceBilling.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: BillingSubscriptionStatus.PAST_DUE }),
      }),
    );
    expect(vi.mocked(sendPaymentFailureReminderEmail)).toHaveBeenCalled();
  });

  it("subscription.cancelled downgrades to starter and notifies", async () => {
    setupMocks();
    const { processDodoWebhookEvent } = await import("@/lib/billing");

    const result = await processDodoWebhookEvent({
      event: makeEvent("subscription.cancelled") as never,
      eventId: "evt_cancel_1",
    });

    expect(result.status).toBe("processed");
    expect(vi.mocked(prisma.workspaceBilling.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: BillingSubscriptionStatus.CANCELED }),
      }),
    );
    expect(vi.mocked(applyWorkspacePlan)).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: "ws-1", planTier: "starter" }),
    );
    expect(vi.mocked(sendPlanCanceledEmail)).toHaveBeenCalled();
  });

  it("ignores events when workspace cannot be resolved", async () => {
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.workspaceBilling.findFirst).mockResolvedValue(null as never);
    const { processDodoWebhookEvent } = await import("@/lib/billing");

    const result = await processDodoWebhookEvent({
      event: {
        type: "payment.succeeded",
        timestamp: new Date().toISOString(),
        data: { metadata: {}, customer: {} },
      } as never,
      eventId: "evt_orphan",
    });

    expect(result.status).toBe("ignored");
    expect(result.reason).toBe("workspace_not_resolved");
  });

  it("returns duplicate when eventId already exists", async () => {
    setupMocks();
    const { Prisma: PrismaErrors } = await import("@prisma/client");
    const duplicateError = new PrismaErrors.PrismaClientKnownRequestError("Unique constraint", {
      code: "P2002",
      clientVersion: "5.0.0",
    });
    vi.mocked(prisma.billingEventLog.create).mockRejectedValueOnce(duplicateError);

    const { processDodoWebhookEvent } = await import("@/lib/billing");

    const result = await processDodoWebhookEvent({
      event: makeEvent("payment.succeeded") as never,
      eventId: "evt_dup_1",
    });

    expect(result.status).toBe("duplicate");
    expect(result.workspaceId).toBe("ws-1");
  });

  it("subscription.active sets ACTIVE status and applies plan", async () => {
    setupMocks();
    const { processDodoWebhookEvent } = await import("@/lib/billing");

    const result = await processDodoWebhookEvent({
      event: makeEvent("subscription.active", { status: "active" }) as never,
      eventId: "evt_active_1",
    });

    expect(result.status).toBe("processed");
    expect(vi.mocked(prisma.workspaceBilling.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: BillingSubscriptionStatus.ACTIVE }),
      }),
    );
    expect(vi.mocked(applyWorkspacePlan)).toHaveBeenCalled();
  });

  it("payment.failed suppresses reminder when one was sent recently", async () => {
    setupMocks({ lastFailureReminderAt: new Date(), failureReminderCount: 1 });
    const { processDodoWebhookEvent } = await import("@/lib/billing");

    await processDodoWebhookEvent({
      event: makeEvent("payment.failed") as never,
      eventId: "evt_fail_2",
    });

    expect(vi.mocked(sendPaymentFailureReminderEmail)).not.toHaveBeenCalled();
  });
});
