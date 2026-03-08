# TrustLoop

TrustLoop is a domain-specific SaaS for AI software companies to run customer-facing AI incident operations end-to-end.

## What It Includes
- Incident queue with filters, cursor pagination, owner assignment, and event timeline
- AI triage + customer-update drafting with BYOK provider routing (OpenAI, Gemini, Anthropic)
- Workspace API keys (Bearer auth) and signed webhook intake (Datadog, PagerDuty, Sentry, Generic, Langfuse, Helicone)
- Slack integration (OAuth connect, slash command intake, incident alerts, thread updates)
- Public status page publishing by workspace slug
- Team invites, role management, member removal
- Reminder automation via SQS + worker (email + P1 SMS)
- Billing via Dodo Payments subscriptions + quota plan mapping
- Executive analytics charts and compliance exports (CSV + incident PDF)
- PWA manifest/service worker scaffold for installable app behavior
- Public documentation site at `/docs` (Fumadocs with sidebar navigation, citations, and backlinks)

## Tech Stack
- Next.js 16 (App Router), React 19
- Prisma + PostgreSQL
- Redis (cache/session/rate-limit)
- AWS SQS (LocalStack in local dev)
- Stytch (OTP + OAuth)
- Resend (emails)
- Dodo Payments (billing)
- Twilio (SMS)

## Quick Start
From `trustloop/`:

```bash
./start.sh
```

`start.sh` installs deps, ensures `.env`, starts local infra, runs Prisma flow, seeds data, initializes LocalStack queue, runs worker smoke cycle, then starts web + worker.

## Local URLs
- App: `http://localhost:3000`
- Login: `http://localhost:3000/login`
- Register: `http://localhost:3000/register`
- Dashboard: `http://localhost:3000/dashboard`
- Executive: `http://localhost:3000/executive`
- Settings: `http://localhost:3000/settings`
- Docs: `http://localhost:3000/docs`

## Environment Variables
Copy `.env.example` to `.env` and fill values.

### Core
- `NEXT_PUBLIC_APP_URL`
- `DATABASE_URL`
- `REDIS_URL`
- `KEY_ENCRYPTION_SECRET`
- `LOG_LEVEL` (`debug|info|warn|error|fatal`, default `info`)
- `LOG_MODE` (`auto|file|console`, default `auto`)
  - `auto`: writes `/logs/*.log` on long-running hosts and falls back to console-only in serverless runtimes
  - `file`: always tries file streams + console
  - `console`: disables file streams and writes to stdout/stderr only (recommended on Vercel)

### Stytch auth
- `STYTCH_PROJECT_ID`
- `STYTCH_SECRET`
- `STYTCH_PUBLIC_TOKEN` (required for Google/GitHub OAuth start)
- `STYTCH_ENV`
- `STYTCH_OTP_EXPIRATION_MINUTES`
- `STYTCH_SESSION_DURATION_MINUTES`
- `STYTCH_OAUTH_START_MODE` (`b2c` default, or `b2b_discovery`)
- Optional direct start URL overrides:
  - `STYTCH_OAUTH_GOOGLE_START_URL`
  - `STYTCH_OAUTH_GITHUB_START_URL`
- Optional for B2B discovery:
  - `STYTCH_B2B_DISCOVERY_ORGANIZATION_ID`
- Email OTP (login/register/forgot-access) is sent by Stytch, not Resend.

### AI + notifications
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- Resend is used for non-auth app emails (welcome/onboarding/reminders/invites/billing).
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`

### Slack
- `SLACK_CLIENT_ID`
- `SLACK_CLIENT_SECRET`
- `SLACK_SIGNING_SECRET`

### Billing
- `DODO_PAYMENTS_API_KEY`
- `DODO_PAYMENTS_WEBHOOK_KEY`
- `DODO_PAYMENTS_ENV` (`test_mode` or `live_mode`)
- `DODO_PRODUCT_ID_STARTER`
- `DODO_PRODUCT_ID_PRO`
- `DODO_PRODUCT_ID_ENTERPRISE`

### Automation
- `AI_KEY_HEALTH_CRON_SECRET`
- `BILLING_AUTOMATION_CRON_SECRET`
- `REMINDER_STALE_MINUTES`

### LocalStack / AWS-style local infra
- `AWS_REGION=us-east-1`
- `AWS_ACCESS_KEY_ID=test`
- `AWS_SECRET_ACCESS_KEY=test`
- `AWS_ENDPOINT_URL=http://localhost:4566`
- `AWS_ACCOUNT_ID=000000000000`
- `REMINDER_QUEUE_NAME=trustloop-incident-reminders`
- `REMINDER_QUEUE_URL=http://localhost:4566/000000000000/trustloop-incident-reminders`

## OAuth Setup (Stytch)
1. Enable Google and GitHub OAuth providers in Stytch Dashboard.
2. Add redirect URLs in Stytch Dashboard:
   - `http://localhost:3000/api/auth/oauth/callback` (local)
   - production callback URL equivalent
3. Set `STYTCH_PUBLIC_TOKEN` in `.env`.
4. Use login/register OAuth buttons.

## LocalStack
Bring infra up manually if needed:

```bash
docker compose -f docker-compose.localstack.yml up -d
pnpm run localstack:init
```

## Scripts
- `pnpm dev` - web only
- `pnpm dev:full` - web + worker
- `pnpm worker` - reminder worker
- `pnpm worker:once` - one worker cycle
- `pnpm billing:grace:once` - process failed-payment reminders and auto-cancel logic
- `pnpm lint`
- `pnpm build`
- `pnpm prisma:generate`
- `pnpm prisma:deploy`
- `pnpm db:seed`
- `pnpm ai-keys:verify`

## API Highlights
- Auth: `/api/auth/*`, `/api/auth/oauth/[provider]`, `/api/auth/oauth/callback`
- Incidents: `/api/incidents*`, `/api/incidents/export`, `/api/incidents/[id]/export`
- Webhooks: `/api/webhooks/*`
- Slack: `/api/slack/*`
- Billing: `/api/billing/*`
- Workspace/team/settings: `/api/workspace/*`, `/api/settings/*`

## Security Notes
- AI provider keys and webhook secrets are encrypted at rest (AES-256-GCM).
- API keys are bcrypt-hashed and only shown once at creation.
- Session and API-key auth are workspace-scoped.
- Secrets are never returned in full after save and are never used client-side.

## Verification
Current baseline checks:

```bash
pnpm lint
pnpm build
```
