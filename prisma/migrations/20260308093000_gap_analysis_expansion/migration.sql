-- CreateEnum
CREATE TYPE "AIIncidentCategory" AS ENUM (
  'HALLUCINATION',
  'BIAS',
  'DATA_DRIFT',
  'MODEL_DEGRADATION',
  'PROMPT_INJECTION',
  'ADVERSARIAL_INPUT',
  'OUTPUT_FILTER_FAILURE',
  'LATENCY',
  'AVAILABILITY',
  'DATA_PRIVACY',
  'COMPLIANCE',
  'OTHER'
);

-- CreateEnum
CREATE TYPE "WebhookIntegrationType" AS ENUM (
  'DATADOG',
  'PAGERDUTY',
  'SENTRY',
  'GENERIC',
  'LANGFUSE',
  'HELICONE'
);

-- CreateEnum
CREATE TYPE "AiKeyHealthStatus" AS ENUM ('UNKNOWN', 'OK', 'FAILED');

-- AlterEnum
ALTER TYPE "EmailNotificationType" ADD VALUE IF NOT EXISTS 'OWNER_ASSIGNED';
ALTER TYPE "EmailNotificationType" ADD VALUE IF NOT EXISTS 'WORKSPACE_INVITE';

-- AlterTable Workspace
ALTER TABLE "Workspace"
ADD COLUMN "slug" TEXT,
ADD COLUMN "statusPageEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "slackBotToken" TEXT,
ADD COLUMN "slackChannelId" TEXT,
ADD COLUMN "slackTeamId" TEXT,
ADD COLUMN "stripeCustomerId" TEXT,
ADD COLUMN "samlEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "samlMetadataUrl" TEXT,
ADD COLUMN "complianceMode" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable User
ALTER TABLE "User"
ADD COLUMN "phone" TEXT;

-- AlterTable Incident category from TEXT -> enum
ALTER TABLE "Incident"
ADD COLUMN "category_enum" "AIIncidentCategory";

UPDATE "Incident"
SET "category_enum" = CASE
  WHEN "category" IS NULL OR btrim("category") = '' THEN NULL
  WHEN upper("category") = 'HALLUCINATION' THEN 'HALLUCINATION'::"AIIncidentCategory"
  WHEN upper("category") = 'BIAS' THEN 'BIAS'::"AIIncidentCategory"
  WHEN upper("category") IN ('DATA DRIFT', 'DATA_DRIFT') THEN 'DATA_DRIFT'::"AIIncidentCategory"
  WHEN upper("category") IN ('MODEL DEGRADATION', 'MODEL_DEGRADATION') THEN 'MODEL_DEGRADATION'::"AIIncidentCategory"
  WHEN upper("category") IN ('PROMPT INJECTION', 'PROMPT_INJECTION') THEN 'PROMPT_INJECTION'::"AIIncidentCategory"
  WHEN upper("category") IN ('ADVERSARIAL INPUT', 'ADVERSARIAL_INPUT') THEN 'ADVERSARIAL_INPUT'::"AIIncidentCategory"
  WHEN upper("category") IN ('OUTPUT FILTER FAILURE', 'OUTPUT_FILTER_FAILURE') THEN 'OUTPUT_FILTER_FAILURE'::"AIIncidentCategory"
  WHEN upper("category") = 'LATENCY' THEN 'LATENCY'::"AIIncidentCategory"
  WHEN upper("category") = 'AVAILABILITY' THEN 'AVAILABILITY'::"AIIncidentCategory"
  WHEN upper("category") IN ('DATA PRIVACY', 'DATA_PRIVACY') THEN 'DATA_PRIVACY'::"AIIncidentCategory"
  WHEN upper("category") = 'COMPLIANCE' THEN 'COMPLIANCE'::"AIIncidentCategory"
  ELSE 'OTHER'::"AIIncidentCategory"
END;

ALTER TABLE "Incident" DROP COLUMN "category";
ALTER TABLE "Incident" RENAME COLUMN "category_enum" TO "category";

-- AlterTable AiProviderKey
ALTER TABLE "AiProviderKey"
ADD COLUMN "healthStatus" "AiKeyHealthStatus" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN "lastVerifiedAt" TIMESTAMP(3),
ADD COLUMN "lastVerificationError" TEXT;

-- AlterTable WorkspaceQuota
ALTER TABLE "WorkspaceQuota"
ADD COLUMN "reminderIntervalHoursP1" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN "reminderIntervalHoursP2" INTEGER NOT NULL DEFAULT 24;

-- CreateTable WorkspaceApiKey
CREATE TABLE "WorkspaceApiKey" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "keyHash" TEXT NOT NULL,
  "keyPrefix" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,

  CONSTRAINT "WorkspaceApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable WorkspaceInvite
CREATE TABLE "WorkspaceInvite" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WorkspaceInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable StatusUpdate
CREATE TABLE "StatusUpdate" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "incidentId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL,
  "isVisible" BOOLEAN NOT NULL DEFAULT true,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StatusUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable WorkspaceWebhookIntegration
CREATE TABLE "WorkspaceWebhookIntegration" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "type" "WebhookIntegrationType" NOT NULL,
  "encryptedSecret" TEXT NOT NULL,
  "keyLast4" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WorkspaceWebhookIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE INDEX "Incident_workspaceId_category_idx" ON "Incident"("workspaceId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceApiKey_keyPrefix_key" ON "WorkspaceApiKey"("keyPrefix");
CREATE INDEX "WorkspaceApiKey_workspaceId_isActive_idx" ON "WorkspaceApiKey"("workspaceId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceInvite_token_key" ON "WorkspaceInvite"("token");
CREATE INDEX "WorkspaceInvite_workspaceId_email_idx" ON "WorkspaceInvite"("workspaceId", "email");
CREATE INDEX "WorkspaceInvite_workspaceId_expiresAt_idx" ON "WorkspaceInvite"("workspaceId", "expiresAt");

-- CreateIndex
CREATE INDEX "StatusUpdate_workspaceId_publishedAt_idx" ON "StatusUpdate"("workspaceId", "publishedAt");
CREATE INDEX "StatusUpdate_incidentId_publishedAt_idx" ON "StatusUpdate"("incidentId", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceWebhookIntegration_workspaceId_type_key" ON "WorkspaceWebhookIntegration"("workspaceId", "type");
CREATE INDEX "WorkspaceWebhookIntegration_workspaceId_isActive_idx" ON "WorkspaceWebhookIntegration"("workspaceId", "isActive");

-- AddForeignKey
ALTER TABLE "WorkspaceApiKey"
ADD CONSTRAINT "WorkspaceApiKey_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceInvite"
ADD CONSTRAINT "WorkspaceInvite_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceInvite"
ADD CONSTRAINT "WorkspaceInvite_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StatusUpdate"
ADD CONSTRAINT "StatusUpdate_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StatusUpdate"
ADD CONSTRAINT "StatusUpdate_incidentId_fkey"
FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StatusUpdate"
ADD CONSTRAINT "StatusUpdate_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WorkspaceWebhookIntegration"
ADD CONSTRAINT "WorkspaceWebhookIntegration_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
