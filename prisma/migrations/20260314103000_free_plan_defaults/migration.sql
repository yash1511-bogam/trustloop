ALTER TABLE "Workspace"
ALTER COLUMN "planTier" SET DEFAULT 'free';

ALTER TABLE "WorkspaceQuota"
ALTER COLUMN "apiRequestsPerMinute" SET DEFAULT 60,
ALTER COLUMN "incidentsPerDay" SET DEFAULT 5,
ALTER COLUMN "triageRunsPerDay" SET DEFAULT 10,
ALTER COLUMN "customerUpdatesPerDay" SET DEFAULT 5,
ALTER COLUMN "reminderEmailsPerDay" SET DEFAULT 10;

UPDATE "Workspace" AS w
SET "planTier" = 'free'
WHERE w."planTier" <> 'free'
  AND (w."trialEndsAt" IS NULL OR w."trialEndsAt" <= NOW())
  AND NOT EXISTS (
    SELECT 1
    FROM "WorkspaceBilling" AS b
    WHERE b."workspaceId" = w."id"
      AND b."status" IN ('ACTIVE', 'TRIALING')
  );

UPDATE "WorkspaceQuota" AS q
SET
  "apiRequestsPerMinute" = LEAST(q."apiRequestsPerMinute", 60),
  "incidentsPerDay" = LEAST(q."incidentsPerDay", 5),
  "triageRunsPerDay" = LEAST(q."triageRunsPerDay", 10),
  "customerUpdatesPerDay" = LEAST(q."customerUpdatesPerDay", 5),
  "reminderEmailsPerDay" = LEAST(q."reminderEmailsPerDay", 10),
  "onCallRotationEnabled" = FALSE
FROM "Workspace" AS w
WHERE q."workspaceId" = w."id"
  AND w."planTier" = 'free';
