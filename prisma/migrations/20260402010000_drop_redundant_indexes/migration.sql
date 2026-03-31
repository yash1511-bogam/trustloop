-- Drop redundant indexes that duplicate unique constraints

-- AiProviderKey: @@index([workspaceId]) is covered by @@unique([workspaceId, provider])
DROP INDEX IF EXISTS "AiProviderKey_workspaceId_idx";

-- WorkspaceDailyUsage: @@index([workspaceId, usageDate]) is covered by @@unique([workspaceId, usageDate])
DROP INDEX IF EXISTS "WorkspaceDailyUsage_workspaceId_usageDate_idx";

-- IncidentAnalyticsDaily: @@index([workspaceId, day]) is covered by @@unique([workspaceId, day])
DROP INDEX IF EXISTS "IncidentAnalyticsDaily_workspaceId_day_idx";

-- StatusPageSubscriber: @@index([workspaceId]) is covered by @@unique([workspaceId, email])
DROP INDEX IF EXISTS "StatusPageSubscriber_workspaceId_idx";

-- PostMortem: @@index([incidentId]) is covered by @unique on incidentId field
DROP INDEX IF EXISTS "PostMortem_incidentId_idx";
