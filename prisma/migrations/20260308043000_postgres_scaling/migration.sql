-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'MANAGER', 'AGENT');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('NEW', 'INVESTIGATING', 'MITIGATED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('P1', 'P2', 'P3');

-- CreateEnum
CREATE TYPE "IncidentChannel" AS ENUM ('EMAIL', 'CHAT', 'SLACK', 'API', 'OTHER');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('CREATED', 'NOTE', 'STATUS_CHANGED', 'OWNER_CHANGED', 'TRIAGE_RUN', 'CUSTOMER_UPDATE', 'REMINDER');

-- CreateEnum
CREATE TYPE "AiProvider" AS ENUM ('OPENAI', 'GEMINI', 'ANTHROPIC');

-- CreateEnum
CREATE TYPE "WorkflowType" AS ENUM ('INCIDENT_TRIAGE', 'CUSTOMER_UPDATE');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('QUEUED', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "EmailNotificationType" AS ENUM ('REMINDER', 'CUSTOMER_UPDATE', 'INCIDENT_ALERT');

-- CreateEnum
CREATE TYPE "EmailDeliveryStatus" AS ENUM ('SENT', 'FAILED');

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "planTier" TEXT NOT NULL DEFAULT 'pro',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "stytchUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'AGENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "channel" "IncidentChannel" NOT NULL DEFAULT 'EMAIL',
    "status" "IncidentStatus" NOT NULL DEFAULT 'NEW',
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'P3',
    "category" TEXT,
    "ownerUserId" TEXT,
    "modelVersion" TEXT,
    "sourceTicketRef" TEXT,
    "summary" TEXT,
    "triagedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "triageRunCount" INTEGER NOT NULL DEFAULT 0,
    "customerUpdateCount" INTEGER NOT NULL DEFAULT 0,
    "remindersSentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastCustomerUpdateAt" TIMESTAMP(3),

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentEvent" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "eventType" "EventType" NOT NULL,
    "body" TEXT NOT NULL,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiProviderKey" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" "AiProvider" NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "keyLast4" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiProviderKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowSetting" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "workflowType" "WorkflowType" NOT NULL,
    "provider" "AiProvider" NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderJobLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "queueMessageId" TEXT,
    "status" "ReminderStatus" NOT NULL DEFAULT 'QUEUED',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "ReminderJobLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceQuota" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "apiRequestsPerMinute" INTEGER NOT NULL DEFAULT 120,
    "incidentsPerDay" INTEGER NOT NULL DEFAULT 200,
    "triageRunsPerDay" INTEGER NOT NULL DEFAULT 300,
    "customerUpdatesPerDay" INTEGER NOT NULL DEFAULT 300,
    "reminderEmailsPerDay" INTEGER NOT NULL DEFAULT 500,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceQuota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceDailyUsage" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "usageDate" DATE NOT NULL,
    "incidentsCreated" INTEGER NOT NULL DEFAULT 0,
    "triageRuns" INTEGER NOT NULL DEFAULT 0,
    "customerUpdates" INTEGER NOT NULL DEFAULT 0,
    "reminderEmailsSent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceDailyUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentAnalyticsDaily" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "incidentsCreated" INTEGER NOT NULL DEFAULT 0,
    "incidentsResolved" INTEGER NOT NULL DEFAULT 0,
    "openAtEndOfDay" INTEGER NOT NULL DEFAULT 0,
    "p1Created" INTEGER NOT NULL DEFAULT 0,
    "triageRuns" INTEGER NOT NULL DEFAULT 0,
    "customerUpdatesSent" INTEGER NOT NULL DEFAULT 0,
    "reminderEmailsSent" INTEGER NOT NULL DEFAULT 0,
    "mttrMinutesAvg" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncidentAnalyticsDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceExecutiveSnapshot" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "openIncidents" INTEGER NOT NULL DEFAULT 0,
    "p1OpenIncidents" INTEGER NOT NULL DEFAULT 0,
    "incidentsCreatedLast7d" INTEGER NOT NULL DEFAULT 0,
    "incidentsResolvedLast7d" INTEGER NOT NULL DEFAULT 0,
    "avgResolutionHoursLast30d" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "triageCoveragePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "customerUpdateCoveragePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceExecutiveSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailNotificationLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "incidentId" TEXT,
    "type" "EmailNotificationType" NOT NULL,
    "toEmail" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'SENT',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailNotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_stytchUserId_key" ON "User"("stytchUserId");

-- CreateIndex
CREATE INDEX "User_workspaceId_idx" ON "User"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "User_workspaceId_email_key" ON "User"("workspaceId", "email");

-- CreateIndex
CREATE INDEX "Incident_workspaceId_status_idx" ON "Incident"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Incident_workspaceId_severity_idx" ON "Incident"("workspaceId", "severity");

-- CreateIndex
CREATE INDEX "Incident_ownerUserId_idx" ON "Incident"("ownerUserId");

-- CreateIndex
CREATE INDEX "Incident_workspaceId_updatedAt_idx" ON "Incident"("workspaceId", "updatedAt");

-- CreateIndex
CREATE INDEX "IncidentEvent_incidentId_createdAt_idx" ON "IncidentEvent"("incidentId", "createdAt");

-- CreateIndex
CREATE INDEX "AiProviderKey_workspaceId_idx" ON "AiProviderKey"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "AiProviderKey_workspaceId_provider_key" ON "AiProviderKey"("workspaceId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowSetting_workspaceId_workflowType_key" ON "WorkflowSetting"("workspaceId", "workflowType");

-- CreateIndex
CREATE INDEX "ReminderJobLog_workspaceId_status_idx" ON "ReminderJobLog"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "ReminderJobLog_incidentId_idx" ON "ReminderJobLog"("incidentId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceQuota_workspaceId_key" ON "WorkspaceQuota"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceDailyUsage_workspaceId_usageDate_idx" ON "WorkspaceDailyUsage"("workspaceId", "usageDate");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceDailyUsage_workspaceId_usageDate_key" ON "WorkspaceDailyUsage"("workspaceId", "usageDate");

-- CreateIndex
CREATE INDEX "IncidentAnalyticsDaily_workspaceId_day_idx" ON "IncidentAnalyticsDaily"("workspaceId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "IncidentAnalyticsDaily_workspaceId_day_key" ON "IncidentAnalyticsDaily"("workspaceId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceExecutiveSnapshot_workspaceId_key" ON "WorkspaceExecutiveSnapshot"("workspaceId");

-- CreateIndex
CREATE INDEX "EmailNotificationLog_workspaceId_createdAt_idx" ON "EmailNotificationLog"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "EmailNotificationLog_incidentId_idx" ON "EmailNotificationLog"("incidentId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentEvent" ADD CONSTRAINT "IncidentEvent_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentEvent" ADD CONSTRAINT "IncidentEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiProviderKey" ADD CONSTRAINT "AiProviderKey_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowSetting" ADD CONSTRAINT "WorkflowSetting_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderJobLog" ADD CONSTRAINT "ReminderJobLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderJobLog" ADD CONSTRAINT "ReminderJobLog_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceQuota" ADD CONSTRAINT "WorkspaceQuota_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceDailyUsage" ADD CONSTRAINT "WorkspaceDailyUsage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentAnalyticsDaily" ADD CONSTRAINT "IncidentAnalyticsDaily_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceExecutiveSnapshot" ADD CONSTRAINT "WorkspaceExecutiveSnapshot_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailNotificationLog" ADD CONSTRAINT "EmailNotificationLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailNotificationLog" ADD CONSTRAINT "EmailNotificationLog_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

