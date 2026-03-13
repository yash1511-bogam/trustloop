ALTER TABLE "WorkspaceApiKey"
ADD COLUMN "expiresAt" TIMESTAMP(3);

CREATE INDEX "WorkspaceApiKey_workspaceId_expiresAt_idx"
ON "WorkspaceApiKey"("workspaceId", "expiresAt");
