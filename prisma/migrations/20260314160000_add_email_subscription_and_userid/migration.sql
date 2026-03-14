-- CreateTable
CREATE TABLE "EmailSubscription" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subscribed" BOOLEAN NOT NULL DEFAULT true,
    "unsubscribedAt" TIMESTAMP(3),
    "unsubscribeToken" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSubscription_pkey" PRIMARY KEY ("id")
);

-- AddColumn
ALTER TABLE "EarlyAccessRequest" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "EmailSubscription_email_key" ON "EmailSubscription"("email");
CREATE UNIQUE INDEX "EmailSubscription_unsubscribeToken_key" ON "EmailSubscription"("unsubscribeToken");
CREATE INDEX "EmailSubscription_email_idx" ON "EmailSubscription"("email");
CREATE INDEX "EmailSubscription_unsubscribeToken_idx" ON "EmailSubscription"("unsubscribeToken");
