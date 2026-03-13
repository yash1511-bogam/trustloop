-- Add trial support to Workspace
ALTER TABLE "Workspace" ADD COLUMN "trialEndsAt" TIMESTAMP(3);

-- Add TRIALING to BillingSubscriptionStatus enum
ALTER TYPE "BillingSubscriptionStatus" ADD VALUE 'TRIALING';

-- Add trial email notification types
ALTER TYPE "EmailNotificationType" ADD VALUE 'TRIAL_STARTED';
ALTER TYPE "EmailNotificationType" ADD VALUE 'TRIAL_REMINDER';
ALTER TYPE "EmailNotificationType" ADD VALUE 'TRIAL_EXPIRED';

-- Index for trial expiry automation
CREATE INDEX "Workspace_trialEndsAt_idx" ON "Workspace"("trialEndsAt") WHERE "trialEndsAt" IS NOT NULL;
