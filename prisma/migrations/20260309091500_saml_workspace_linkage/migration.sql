ALTER TABLE "Workspace"
ADD COLUMN IF NOT EXISTS "samlOrganizationId" TEXT,
ADD COLUMN IF NOT EXISTS "samlConnectionId" TEXT;

CREATE INDEX IF NOT EXISTS "Workspace_samlOrganizationId_idx"
ON "Workspace" ("samlOrganizationId");

CREATE INDEX IF NOT EXISTS "Workspace_samlConnectionId_idx"
ON "Workspace" ("samlConnectionId");
