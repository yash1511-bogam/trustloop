-- CreateEnum
CREATE TYPE "InternalRole" AS ENUM ('CEO', 'SUPPORT', 'TECH', 'MARKETING');

-- CreateEnum
CREATE TYPE "InternalTeamStatus" AS ENUM ('INVITED', 'ACTIVE', 'REVOKED');

-- AlterEnum: add internal email notification types
ALTER TYPE "EmailNotificationType" ADD VALUE 'INTERNAL_TEAM_INVITE';
ALTER TYPE "EmailNotificationType" ADD VALUE 'INTERNAL_TEAM_WELCOME';
ALTER TYPE "EmailNotificationType" ADD VALUE 'INTERNAL_WORKSPACE_BLOCKED';
ALTER TYPE "EmailNotificationType" ADD VALUE 'INTERNAL_WORKSPACE_UNBLOCKED';
ALTER TYPE "EmailNotificationType" ADD VALUE 'INTERNAL_PLAN_UPGRADED';

-- AlterTable: workspace blocking
ALTER TABLE "Workspace" ADD COLUMN "blockedAt" TIMESTAMP(3);
ALTER TABLE "Workspace" ADD COLUMN "blockReason" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "blockedByEmail" TEXT;

-- CreateTable: InternalTeamMember
CREATE TABLE "InternalTeamMember" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "InternalRole" NOT NULL,
    "status" "InternalTeamStatus" NOT NULL DEFAULT 'INVITED',
    "invitedBy" TEXT,
    "inviteToken" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InternalTeamMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InternalTeamMember_email_key" ON "InternalTeamMember"("email");
CREATE UNIQUE INDEX "InternalTeamMember_inviteToken_key" ON "InternalTeamMember"("inviteToken");
CREATE INDEX "InternalTeamMember_email_idx" ON "InternalTeamMember"("email");
CREATE INDEX "InternalTeamMember_inviteToken_idx" ON "InternalTeamMember"("inviteToken");
CREATE INDEX "InternalTeamMember_status_idx" ON "InternalTeamMember"("status");

-- Seed CEO
INSERT INTO "InternalTeamMember" ("id", "email", "role", "status", "acceptedAt", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'yashwanthbogam4@gmail.com', 'CEO', 'ACTIVE', NOW(), NOW(), NOW());

-- CreateTable: PromoCode
CREATE TABLE "PromoCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountPercent" INTEGER,
    "discountAmount" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "dodoDiscountId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");
CREATE INDEX "PromoCode_code_idx" ON "PromoCode"("code");
CREATE INDEX "PromoCode_isActive_validUntil_idx" ON "PromoCode"("isActive", "validUntil");
