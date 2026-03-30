-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN "customDomain" TEXT,
ADD COLUMN "customDomainVerified" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_customDomain_key" ON "Workspace"("customDomain");
