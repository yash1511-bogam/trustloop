CREATE TABLE IF NOT EXISTS "PushSubscription" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "userAgent" TEXT,
  "lastNotifiedAt" TIMESTAMP(3),
  "disabledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key"
ON "PushSubscription" ("endpoint");

CREATE INDEX IF NOT EXISTS "PushSubscription_workspaceId_userId_idx"
ON "PushSubscription" ("workspaceId", "userId");

CREATE INDEX IF NOT EXISTS "PushSubscription_workspaceId_disabledAt_idx"
ON "PushSubscription" ("workspaceId", "disabledAt");

ALTER TABLE "PushSubscription"
ADD CONSTRAINT "PushSubscription_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PushSubscription"
ADD CONSTRAINT "PushSubscription_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
