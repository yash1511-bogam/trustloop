# TrustLoop

TrustLoop is an incident operations platform purpose-built for AI software companies. It provides end-to-end management of customer-facing AI incidents — from intake and triage through resolution and executive reporting.

## Key Capabilities

- **Incident Management** — Queue with filters, cursor pagination, owner assignment, and event timeline
- **AI-Powered Triage** — BYOK provider routing across OpenAI, Gemini, and Anthropic
- **Customer Communication** — AI-drafted updates with approval controls and full timeline traceability
- **Webhook Intake** — Signed integrations for Datadog, PagerDuty, Sentry, Langfuse, Helicone, and generic JSON
- **Slack Integration** — OAuth connect, slash command intake, incident alerts, and thread updates
- **Public Status Page** — Customer-facing incident updates published by workspace slug
- **Team Management** — Invites, role-based access (Owner, Manager, Agent), and member administration
- **Reminder Automation** — SQS-based worker with email reminders and P1 SMS escalation
- **Billing** — Dodo Payments subscriptions with quota-based plan mapping
- **Executive Analytics** — Trend charts, coverage metrics, and compliance exports (CSV, PDF)
- **PWA Support** — Service worker, browser push subscriptions, and test notifications
- **Documentation** — Integrated docs site at `/docs` powered by Fumadocs

## Technology Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19 |
| Database | PostgreSQL via Prisma ORM |
| Cache / Sessions | Redis |
| Queue | AWS SQS (LocalStack for local development) |
| Authentication | Stytch (OTP, OAuth, SAML SSO) |
| Email | Resend |
| Billing | Dodo Payments |
| SMS | Twilio |

## Quick Start

```bash
./start.sh
```

The start script installs dependencies, configures `.env`, starts local infrastructure, runs Prisma migrations, seeds the database, initializes the LocalStack queue, executes a worker smoke test, and starts the web server and worker process.

## Local Development URLs

| Service | URL |
| --- | --- |
| Application | `http://localhost:3000` |
| Login | `http://localhost:3000/login` |
| Register | `http://localhost:3000/register` |
| Dashboard | `http://localhost:3000/dashboard` |
| Executive View | `http://localhost:3000/executive` |
| Settings | `http://localhost:3000/settings` |
| Documentation | `http://localhost:3000/docs` |

## Environment Configuration

Copy `.env.example` to `.env` and populate the required values.

### Core

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Public application URL |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `KEY_ENCRYPTION_SECRET` | Encryption key for secrets at rest |
| `LOG_LEVEL` | `debug`, `info`, `warn`, `error`, `fatal` (default: `info`) |
| `LOG_MODE` | `auto`, `file`, `console` (default: `auto`) |

Log mode behavior:

- `auto` — Writes to `/logs/*.log` on long-running hosts; falls back to console in serverless runtimes
- `file` — Always writes file streams and console output
- `console` — Console-only output; recommended for Vercel deployments

### Authentication (Stytch)

| Variable | Description |
| --- | --- |
| `STYTCH_PROJECT_ID` | Stytch project identifier |
| `STYTCH_SECRET` | Stytch project secret |
| `STYTCH_PUBLIC_TOKEN` | Required for Google/GitHub OAuth |
| `STYTCH_ENV` | Stytch environment |
| `STYTCH_OTP_EXPIRATION_MINUTES` | OTP code expiration |
| `STYTCH_SESSION_DURATION_MINUTES` | Session duration |
| `STYTCH_OAUTH_START_MODE` | `b2c` (default) or `b2b_discovery` |

SAML SSO is enabled when `STYTCH_OAUTH_START_MODE=b2b_discovery` and workspace SAML metadata is configured.

Optional overrides:

- `STYTCH_OAUTH_GOOGLE_START_URL` — Direct Google OAuth start URL
- `STYTCH_OAUTH_GITHUB_START_URL` — Direct GitHub OAuth start URL
- `STYTCH_B2B_DISCOVERY_ORGANIZATION_ID` — B2B discovery organization ID

Email OTP (login, register, forgot access) is sent by Stytch, not Resend.

### Email and SMS

| Variable | Description |
| --- | --- |
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM_EMAIL` | Sender email address |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_FROM_NUMBER` | Twilio sender number |

Resend handles non-auth application emails: welcome, onboarding, reminders, invites, and billing notifications.

### Slack

| Variable | Description |
| --- | --- |
| `SLACK_CLIENT_ID` | Slack app client ID |
| `SLACK_CLIENT_SECRET` | Slack app client secret |
| `SLACK_SIGNING_SECRET` | Slack request signing secret |

### Billing (Dodo Payments)

| Variable | Description |
| --- | --- |
| `DODO_PAYMENTS_API_KEY` | Dodo Payments API key |
| `DODO_PAYMENTS_WEBHOOK_KEY` | Webhook verification key |
| `DODO_PAYMENTS_ENV` | `test_mode` or `live_mode` |
| `DODO_PRODUCT_ID_STARTER` | Starter plan product ID |
| `DODO_PRODUCT_ID_PRO` | Pro plan product ID |
| `DODO_PRODUCT_ID_ENTERPRISE` | Enterprise plan product ID |

### Automation

| Variable | Description |
| --- | --- |
| `AI_KEY_HEALTH_CRON_SECRET` | Secret for AI key health check cron |
| `BILLING_AUTOMATION_CRON_SECRET` | Secret for billing automation cron |
| `REMINDER_ENQUEUE_CRON_SECRET` | Secret for reminder enqueue cron |
| `REMINDER_STALE_MINUTES` | Stale reminder threshold |

### Web Push (PWA)

| Variable | Description |
| --- | --- |
| `VAPID_SUBJECT` | VAPID subject (e.g., `mailto:alerts@yourdomain.com`) |
| `VAPID_PUBLIC_KEY` | VAPID public key |
| `VAPID_PRIVATE_KEY` | VAPID private key |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Optional; falls back to `VAPID_PUBLIC_KEY` |

Generate VAPID keys:

```bash
npx web-push generate-vapid-keys
```

### LocalStack (Local Development)

| Variable | Description |
| --- | --- |
| `AWS_REGION` | AWS region (default: `us-east-1`) |
| `AWS_ACCESS_KEY_ID` | LocalStack access key (default: `test`) |
| `AWS_SECRET_ACCESS_KEY` | LocalStack secret key (default: `test`) |
| `AWS_ENDPOINT_URL` | LocalStack endpoint (default: `http://localhost:4566`) |
| `AWS_ACCOUNT_ID` | LocalStack account ID (default: `000000000000`) |
| `REMINDER_QUEUE_NAME` | SQS queue name |
| `REMINDER_QUEUE_URL` | SQS queue URL |

## OAuth Configuration (Stytch)

1. Enable Google and GitHub OAuth providers in the Stytch Dashboard.
2. Add redirect URLs:
   - Local: `http://localhost:3000/api/auth/oauth/callback`
   - Production: Your production callback URL
3. Set `STYTCH_PUBLIC_TOKEN` in `.env`.

## LocalStack Setup

```bash
docker compose -f docker-compose.localstack.yml up -d
pnpm run localstack:init
```

## Available Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start web server (development) |
| `pnpm dev:full` | Start web server and worker (development) |
| `pnpm worker` | Start reminder worker |
| `pnpm worker:once` | Execute one worker cycle |
| `pnpm billing:grace:once` | Process payment failure reminders and auto-cancel |
| `pnpm lint` | Run ESLint |
| `pnpm build` | Production build |
| `pnpm prisma:generate` | Generate Prisma client |
| `pnpm prisma:deploy` | Deploy database migrations |
| `pnpm db:seed` | Seed the database |
| `pnpm ai-keys:verify` | Verify AI provider key health |

## API Routes

| Category | Endpoints |
| --- | --- |
| Authentication | `/api/auth/*`, `/api/auth/oauth/[provider]`, `/api/auth/oauth/callback` |
| SAML | `/api/auth/saml/start`, `/api/auth/saml/callback` |
| Incidents | `/api/incidents*`, `/api/incidents/export`, `/api/incidents/[id]/export` |
| Webhooks | `/api/webhooks/*` |
| Slack | `/api/slack/*` |
| Billing | `/api/billing/*` |
| Push Notifications | `/api/notifications/push`, `/api/notifications/push/test` |
| Workspace & Settings | `/api/workspace/*`, `/api/settings/*` |

## Security

- AI provider keys and webhook secrets are encrypted at rest using AES-256-GCM.
- Workspace API keys are bcrypt-hashed and displayed only once at creation.
- Session and API key authentication are workspace-scoped.
- Secrets are never returned in full after initial save and are never exposed client-side.

## Verification

```bash
pnpm lint
pnpm build
```
