import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

const defaultServerEnv = {
  ...process.env,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? baseURL,
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/trustloop?schema=public",
  REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
  STYTCH_PROJECT_ID: process.env.STYTCH_PROJECT_ID ?? "project-test-placeholder",
  STYTCH_SECRET: process.env.STYTCH_SECRET ?? "secret-test-placeholder",
  STYTCH_ENV: process.env.STYTCH_ENV ?? "test",
  KEY_ENCRYPTION_SECRET:
    process.env.KEY_ENCRYPTION_SECRET ??
    "placeholder-key-encryption-secret-123456789",
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? "re_placeholder",
  RESEND_FROM_EMAIL:
    process.env.RESEND_FROM_EMAIL ?? "TrustLoop <onboarding@resend.dev>",
  DODO_PAYMENTS_API_KEY:
    process.env.DODO_PAYMENTS_API_KEY ?? "dodo_test_placeholder",
  DODO_PAYMENTS_WEBHOOK_KEY:
    process.env.DODO_PAYMENTS_WEBHOOK_KEY ?? "dodo_whsec_placeholder",
  DODO_PAYMENTS_ENV: process.env.DODO_PAYMENTS_ENV ?? "test_mode",
  DODO_PRODUCT_ID_STARTER:
    process.env.DODO_PRODUCT_ID_STARTER ?? "prod_test_starter",
  DODO_PRODUCT_ID_PRO: process.env.DODO_PRODUCT_ID_PRO ?? "prod_test_pro",
  DODO_PRODUCT_ID_ENTERPRISE:
    process.env.DODO_PRODUCT_ID_ENTERPRISE ?? "prod_test_enterprise",
  BILLING_AUTOMATION_CRON_SECRET:
    process.env.BILLING_AUTOMATION_CRON_SECRET ?? "billing-cron-test-secret",
  REMINDER_ENQUEUE_CRON_SECRET:
    process.env.REMINDER_ENQUEUE_CRON_SECRET ?? "reminder-enqueue-test-secret",
  AI_KEY_HEALTH_CRON_SECRET:
    process.env.AI_KEY_HEALTH_CRON_SECRET ?? "ai-key-health-test-secret",
  AWS_REGION: process.env.AWS_REGION ?? "us-east-1",
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ?? "test",
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ?? "test",
  AWS_ENDPOINT_URL: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566",
  AWS_ACCOUNT_ID: process.env.AWS_ACCOUNT_ID ?? "000000000000",
  REMINDER_QUEUE_NAME:
    process.env.REMINDER_QUEUE_NAME ?? "trustloop-incident-reminders",
  REMINDER_QUEUE_URL:
    process.env.REMINDER_QUEUE_URL ??
    "http://localhost:4566/000000000000/trustloop-incident-reminders",
  TRUSTLOOP_STUB_AUTH: process.env.TRUSTLOOP_STUB_AUTH ?? "1",
  TRUSTLOOP_STUB_OTP_CODE: process.env.TRUSTLOOP_STUB_OTP_CODE ?? "000000",
  TRUSTLOOP_STUB_EMAIL_DELIVERY:
    process.env.TRUSTLOOP_STUB_EMAIL_DELIVERY ?? "1",
};

const webServerCommand =
  process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ??
  (process.env.CI ? "pnpm dev" : "pnpm start:local");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: webServerCommand,
    env: defaultServerEnv,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
