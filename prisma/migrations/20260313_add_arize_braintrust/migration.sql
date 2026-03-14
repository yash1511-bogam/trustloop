-- Add new webhook integration types
ALTER TYPE "WebhookIntegrationType" ADD VALUE IF NOT EXISTS 'ARIZE_PHOENIX';
ALTER TYPE "WebhookIntegrationType" ADD VALUE IF NOT EXISTS 'BRAINTRUST';
