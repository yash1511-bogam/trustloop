-- Add scheduled deletion to Workspace
ALTER TABLE "Workspace" ADD COLUMN "scheduledDeletionAt" TIMESTAMP(3);

-- StatusPageSubscriber
CREATE TABLE "StatusPageSubscriber" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StatusPageSubscriber_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StatusPageSubscriber_workspaceId_email_key" ON "StatusPageSubscriber"("workspaceId", "email");
CREATE INDEX "StatusPageSubscriber_workspaceId_idx" ON "StatusPageSubscriber"("workspaceId");
ALTER TABLE "StatusPageSubscriber" ADD CONSTRAINT "StatusPageSubscriber_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
