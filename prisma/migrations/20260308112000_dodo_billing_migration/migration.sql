-- Alter enum for additional email notifications
ALTER TYPE "EmailNotificationType" ADD VALUE IF NOT EXISTS 'PAYMENT_CONFIRMATION';
ALTER TYPE "EmailNotificationType" ADD VALUE IF NOT EXISTS 'PAYMENT_RECEIPT';
ALTER TYPE "EmailNotificationType" ADD VALUE IF NOT EXISTS 'PAYMENT_FAILURE_REMINDER';
ALTER TYPE "EmailNotificationType" ADD VALUE IF NOT EXISTS 'PLAN_CANCELED';

-- New billing enums
CREATE TYPE "BillingSubscriptionStatus" AS ENUM (
  'NONE',
  'PENDING',
  'ACTIVE',
  'PAST_DUE',
  'CANCELED'
);

CREATE TYPE "BillingEventProcessStatus" AS ENUM (
  'PROCESSED',
  'IGNORED',
  'FAILED'
);

-- Remove Stripe-specific workspace column
ALTER TABLE "Workspace" DROP COLUMN IF EXISTS "stripeCustomerId";

-- Create workspace billing state table
CREATE TABLE "WorkspaceBilling" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'DODO',
  "dodoCustomerId" TEXT,
  "dodoSubscriptionId" TEXT,
  "dodoProductId" TEXT,
  "dodoCheckoutSessionId" TEXT,
  "status" "BillingSubscriptionStatus" NOT NULL DEFAULT 'NONE',
  "currentPeriodStart" TIMESTAMP(3),
  "currentPeriodEnd" TIMESTAMP(3),
  "lastPaymentId" TEXT,
  "lastPaymentAt" TIMESTAMP(3),
  "lastPaymentAmount" INTEGER,
  "lastPaymentCurrency" TEXT,
  "lastInvoiceUrl" TEXT,
  "discountCode" TEXT,
  "paymentFailedAt" TIMESTAMP(3),
  "failureReminderCount" INTEGER NOT NULL DEFAULT 0,
  "lastFailureReminderAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "cancelReason" TEXT,
  "metadataJson" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WorkspaceBilling_pkey" PRIMARY KEY ("id")
);

-- Create billing event log table
CREATE TABLE "BillingEventLog" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "workspaceBillingId" TEXT,
  "eventId" TEXT,
  "eventType" TEXT NOT NULL,
  "providerEventCreatedAt" TIMESTAMP(3),
  "paymentId" TEXT,
  "subscriptionId" TEXT,
  "amount" INTEGER,
  "currency" TEXT,
  "processStatus" "BillingEventProcessStatus" NOT NULL DEFAULT 'PROCESSED',
  "errorMessage" TEXT,
  "payloadJson" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BillingEventLog_pkey" PRIMARY KEY ("id")
);

-- WorkspaceBilling indexes
CREATE UNIQUE INDEX "WorkspaceBilling_workspaceId_key" ON "WorkspaceBilling"("workspaceId");
CREATE INDEX "WorkspaceBilling_status_paymentFailedAt_idx" ON "WorkspaceBilling"("status", "paymentFailedAt");
CREATE INDEX "WorkspaceBilling_dodoCustomerId_idx" ON "WorkspaceBilling"("dodoCustomerId");
CREATE INDEX "WorkspaceBilling_dodoSubscriptionId_idx" ON "WorkspaceBilling"("dodoSubscriptionId");

-- BillingEventLog indexes
CREATE UNIQUE INDEX "BillingEventLog_eventId_key" ON "BillingEventLog"("eventId");
CREATE INDEX "BillingEventLog_workspaceId_createdAt_idx" ON "BillingEventLog"("workspaceId", "createdAt");
CREATE INDEX "BillingEventLog_workspaceBillingId_createdAt_idx" ON "BillingEventLog"("workspaceBillingId", "createdAt");
CREATE INDEX "BillingEventLog_eventType_idx" ON "BillingEventLog"("eventType");

-- Foreign keys
ALTER TABLE "WorkspaceBilling"
ADD CONSTRAINT "WorkspaceBilling_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BillingEventLog"
ADD CONSTRAINT "BillingEventLog_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BillingEventLog"
ADD CONSTRAINT "BillingEventLog_workspaceBillingId_fkey"
FOREIGN KEY ("workspaceBillingId") REFERENCES "WorkspaceBilling"("id") ON DELETE SET NULL ON UPDATE CASCADE;
