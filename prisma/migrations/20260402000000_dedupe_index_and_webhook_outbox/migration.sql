-- Issue 7: Partial unique index for incident dedup (only non-resolved, non-null fingerprints)
CREATE UNIQUE INDEX "Incident_workspace_fingerprint_open_unique"
  ON "Incident" ("workspaceId", "duplicateFingerprint")
  WHERE "duplicateFingerprint" IS NOT NULL AND "status" != 'RESOLVED';

-- Issue 8: Outbound webhook outbox table for durable delivery
CREATE TABLE "OutboundWebhookOutbox" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "incidentId" TEXT,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lastError" TEXT,
    "processAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboundWebhookOutbox_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OutboundWebhookOutbox_processAt_attempts_idx" ON "OutboundWebhookOutbox"("processAt", "attempts");
CREATE INDEX "OutboundWebhookOutbox_workspaceId_idx" ON "OutboundWebhookOutbox"("workspaceId");

ALTER TABLE "OutboundWebhookOutbox" ADD CONSTRAINT "OutboundWebhookOutbox_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
