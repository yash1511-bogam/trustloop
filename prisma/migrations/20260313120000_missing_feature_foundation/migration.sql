CREATE TYPE "CustomerUpdateDraftStatus" AS ENUM (
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'PUBLISHED'
);

CREATE TYPE "CustomerUpdateApprovalDecision" AS ENUM (
  'APPROVED',
  'REJECTED'
);

CREATE TYPE "SlaState" AS ENUM (
  'ON_TRACK',
  'FIRST_RESPONSE_BREACHED',
  'RESOLUTION_BREACHED'
);

ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'CUSTOMER_UPDATE_SUBMITTED';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'CUSTOMER_UPDATE_APPROVED';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'CUSTOMER_UPDATE_REJECTED';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'CUSTOMER_UPDATE_PUBLISHED';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'BULK_OPERATION';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'SLA_BREACH';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'AUTO_ESCALATED';

ALTER TABLE "Workspace"
ADD COLUMN "customerUpdateApprovalsRequired" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Incident"
ADD COLUMN "templateId" TEXT,
ADD COLUMN "duplicateFingerprint" TEXT,
ADD COLUMN "firstRespondedAt" TIMESTAMP(3),
ADD COLUMN "firstCustomerUpdateAt" TIMESTAMP(3),
ADD COLUMN "slaFirstResponseDueAt" TIMESTAMP(3),
ADD COLUMN "slaResolutionDueAt" TIMESTAMP(3),
ADD COLUMN "slaFirstResponseBreachedAt" TIMESTAMP(3),
ADD COLUMN "slaResolutionBreachedAt" TIMESTAMP(3),
ADD COLUMN "slaState" "SlaState" NOT NULL DEFAULT 'ON_TRACK',
ADD COLUMN "priorityEscalatedAt" TIMESTAMP(3);

ALTER TABLE "WorkspaceApiKey"
ADD COLUMN "scopes" TEXT[] NOT NULL DEFAULT ARRAY[
  'incidents:read',
  'incidents:write',
  'incidents:triage',
  'incidents:delete',
  'customer-updates:write',
  'customer-updates:approve',
  'status-updates:write',
  'settings:read',
  'settings:write',
  'webhooks:ingest'
]::TEXT[],
ADD COLUMN "ipAllowlist" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "WorkspaceMembership" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'AGENT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WorkspaceMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkspaceSlaPolicy" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "firstResponseHoursP1" INTEGER NOT NULL DEFAULT 1,
  "firstResponseHoursP2" INTEGER NOT NULL DEFAULT 4,
  "firstResponseHoursP3" INTEGER NOT NULL DEFAULT 24,
  "resolutionHoursP1" INTEGER NOT NULL DEFAULT 4,
  "resolutionHoursP2" INTEGER NOT NULL DEFAULT 24,
  "resolutionHoursP3" INTEGER NOT NULL DEFAULT 72,
  "autoEscalateP2AfterHours" INTEGER NOT NULL DEFAULT 12,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WorkspaceSlaPolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IncidentTemplate" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "titleTemplate" TEXT NOT NULL,
  "descriptionTemplate" TEXT NOT NULL,
  "defaultSeverity" "IncidentSeverity" NOT NULL DEFAULT 'P3',
  "defaultCategory" "AIIncidentCategory",
  "defaultChannel" "IncidentChannel" NOT NULL DEFAULT 'EMAIL',
  "defaultModelVersion" TEXT,
  "defaultTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archivedAt" TIMESTAMP(3),

  CONSTRAINT "IncidentTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IncidentTag" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "IncidentTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IncidentTagAssignment" (
  "id" TEXT NOT NULL,
  "incidentId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  "assignedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "IncidentTagAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerUpdateDraft" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "incidentId" TEXT NOT NULL,
  "authorUserId" TEXT,
  "body" TEXT NOT NULL,
  "sourceLabel" TEXT,
  "status" "CustomerUpdateDraftStatus" NOT NULL DEFAULT 'DRAFT',
  "customerEmail" TEXT,
  "approvalsRequired" INTEGER NOT NULL DEFAULT 1,
  "submittedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "publishedAt" TIMESTAMP(3),
  "emailedAt" TIMESTAMP(3),
  "emailMessageId" TEXT,
  "statusUpdateId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CustomerUpdateDraft_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerUpdateApproval" (
  "id" TEXT NOT NULL,
  "draftId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "decision" "CustomerUpdateApprovalDecision" NOT NULL,
  "comment" TEXT,
  "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CustomerUpdateApproval_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "actorApiKeyId" TEXT,
  "action" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT,
  "summary" TEXT NOT NULL,
  "metadataJson" TEXT,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MaintenanceWindow" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "isVisible" BOOLEAN NOT NULL DEFAULT true,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MaintenanceWindow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkspaceOutboundWebhook" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "encryptedSecret" TEXT NOT NULL,
  "keyLast4" TEXT NOT NULL,
  "subscribedEvents" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastDeliveredAt" TIMESTAMP(3),
  "lastErrorAt" TIMESTAMP(3),
  "lastErrorMessage" TEXT,
  "lastStatusCode" INTEGER,
  "failureCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WorkspaceOutboundWebhook_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OutboundWebhookDelivery" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "webhookId" TEXT NOT NULL,
  "incidentId" TEXT,
  "eventType" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "isSuccess" BOOLEAN NOT NULL,
  "statusCode" INTEGER,
  "responseBody" TEXT,
  "errorMessage" TEXT,
  "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OutboundWebhookDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkspaceMembership_workspaceId_userId_key"
ON "WorkspaceMembership"("workspaceId", "userId");

CREATE INDEX "WorkspaceMembership_userId_workspaceId_idx"
ON "WorkspaceMembership"("userId", "workspaceId");

CREATE UNIQUE INDEX "WorkspaceSlaPolicy_workspaceId_key"
ON "WorkspaceSlaPolicy"("workspaceId");

CREATE UNIQUE INDEX "IncidentTemplate_workspaceId_name_key"
ON "IncidentTemplate"("workspaceId", "name");

CREATE INDEX "IncidentTemplate_workspaceId_archivedAt_idx"
ON "IncidentTemplate"("workspaceId", "archivedAt");

CREATE UNIQUE INDEX "IncidentTag_workspaceId_name_key"
ON "IncidentTag"("workspaceId", "name");

CREATE INDEX "IncidentTag_workspaceId_idx"
ON "IncidentTag"("workspaceId");

CREATE UNIQUE INDEX "IncidentTagAssignment_incidentId_tagId_key"
ON "IncidentTagAssignment"("incidentId", "tagId");

CREATE INDEX "IncidentTagAssignment_tagId_idx"
ON "IncidentTagAssignment"("tagId");

CREATE UNIQUE INDEX "CustomerUpdateDraft_statusUpdateId_key"
ON "CustomerUpdateDraft"("statusUpdateId");

CREATE INDEX "CustomerUpdateDraft_workspaceId_status_updatedAt_idx"
ON "CustomerUpdateDraft"("workspaceId", "status", "updatedAt");

CREATE INDEX "CustomerUpdateDraft_incidentId_createdAt_idx"
ON "CustomerUpdateDraft"("incidentId", "createdAt");

CREATE UNIQUE INDEX "CustomerUpdateApproval_draftId_userId_key"
ON "CustomerUpdateApproval"("draftId", "userId");

CREATE INDEX "CustomerUpdateApproval_userId_decidedAt_idx"
ON "CustomerUpdateApproval"("userId", "decidedAt");

CREATE INDEX "AuditLog_workspaceId_createdAt_idx"
ON "AuditLog"("workspaceId", "createdAt");

CREATE INDEX "AuditLog_actorUserId_createdAt_idx"
ON "AuditLog"("actorUserId", "createdAt");

CREATE INDEX "AuditLog_actorApiKeyId_createdAt_idx"
ON "AuditLog"("actorApiKeyId", "createdAt");

CREATE INDEX "MaintenanceWindow_workspaceId_startsAt_endsAt_idx"
ON "MaintenanceWindow"("workspaceId", "startsAt", "endsAt");

CREATE INDEX "WorkspaceOutboundWebhook_workspaceId_isActive_idx"
ON "WorkspaceOutboundWebhook"("workspaceId", "isActive");

CREATE INDEX "OutboundWebhookDelivery_workspaceId_deliveredAt_idx"
ON "OutboundWebhookDelivery"("workspaceId", "deliveredAt");

CREATE INDEX "OutboundWebhookDelivery_webhookId_deliveredAt_idx"
ON "OutboundWebhookDelivery"("webhookId", "deliveredAt");

CREATE INDEX "OutboundWebhookDelivery_incidentId_deliveredAt_idx"
ON "OutboundWebhookDelivery"("incidentId", "deliveredAt");

CREATE INDEX "Incident_workspaceId_duplicateFingerprint_idx"
ON "Incident"("workspaceId", "duplicateFingerprint");

CREATE INDEX "Incident_workspaceId_slaState_idx"
ON "Incident"("workspaceId", "slaState");

CREATE INDEX "Incident_templateId_idx"
ON "Incident"("templateId");

ALTER TABLE "Incident"
ADD CONSTRAINT "Incident_templateId_fkey"
FOREIGN KEY ("templateId") REFERENCES "IncidentTemplate"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WorkspaceMembership"
ADD CONSTRAINT "WorkspaceMembership_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceMembership"
ADD CONSTRAINT "WorkspaceMembership_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceSlaPolicy"
ADD CONSTRAINT "WorkspaceSlaPolicy_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IncidentTemplate"
ADD CONSTRAINT "IncidentTemplate_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IncidentTag"
ADD CONSTRAINT "IncidentTag_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IncidentTagAssignment"
ADD CONSTRAINT "IncidentTagAssignment_incidentId_fkey"
FOREIGN KEY ("incidentId") REFERENCES "Incident"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IncidentTagAssignment"
ADD CONSTRAINT "IncidentTagAssignment_tagId_fkey"
FOREIGN KEY ("tagId") REFERENCES "IncidentTag"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IncidentTagAssignment"
ADD CONSTRAINT "IncidentTagAssignment_assignedByUserId_fkey"
FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CustomerUpdateDraft"
ADD CONSTRAINT "CustomerUpdateDraft_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomerUpdateDraft"
ADD CONSTRAINT "CustomerUpdateDraft_incidentId_fkey"
FOREIGN KEY ("incidentId") REFERENCES "Incident"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomerUpdateDraft"
ADD CONSTRAINT "CustomerUpdateDraft_authorUserId_fkey"
FOREIGN KEY ("authorUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CustomerUpdateDraft"
ADD CONSTRAINT "CustomerUpdateDraft_statusUpdateId_fkey"
FOREIGN KEY ("statusUpdateId") REFERENCES "StatusUpdate"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CustomerUpdateApproval"
ADD CONSTRAINT "CustomerUpdateApproval_draftId_fkey"
FOREIGN KEY ("draftId") REFERENCES "CustomerUpdateDraft"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomerUpdateApproval"
ADD CONSTRAINT "CustomerUpdateApproval_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuditLog"
ADD CONSTRAINT "AuditLog_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuditLog"
ADD CONSTRAINT "AuditLog_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AuditLog"
ADD CONSTRAINT "AuditLog_actorApiKeyId_fkey"
FOREIGN KEY ("actorApiKeyId") REFERENCES "WorkspaceApiKey"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MaintenanceWindow"
ADD CONSTRAINT "MaintenanceWindow_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MaintenanceWindow"
ADD CONSTRAINT "MaintenanceWindow_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WorkspaceOutboundWebhook"
ADD CONSTRAINT "WorkspaceOutboundWebhook_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OutboundWebhookDelivery"
ADD CONSTRAINT "OutboundWebhookDelivery_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OutboundWebhookDelivery"
ADD CONSTRAINT "OutboundWebhookDelivery_webhookId_fkey"
FOREIGN KEY ("webhookId") REFERENCES "WorkspaceOutboundWebhook"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OutboundWebhookDelivery"
ADD CONSTRAINT "OutboundWebhookDelivery_incidentId_fkey"
FOREIGN KEY ("incidentId") REFERENCES "Incident"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "WorkspaceMembership" (
  "id",
  "workspaceId",
  "userId",
  "role",
  "createdAt",
  "updatedAt"
)
SELECT
  'wsm_' || md5("workspaceId" || ':' || "id"),
  "workspaceId",
  "id",
  "role",
  COALESCE("createdAt", CURRENT_TIMESTAMP),
  CURRENT_TIMESTAMP
FROM "User"
ON CONFLICT ("workspaceId", "userId") DO NOTHING;

INSERT INTO "WorkspaceSlaPolicy" (
  "id",
  "workspaceId",
  "createdAt",
  "updatedAt"
)
SELECT
  'sla_' || md5("id"),
  "id",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Workspace"
ON CONFLICT ("workspaceId") DO NOTHING;
