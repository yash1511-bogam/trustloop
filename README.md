# TrustLoop

TrustLoop is a SaaS platform for **AI software companies** to run incident operations end-to-end:
- intake and triage
- ownership and customer-safe updates
- tenant-aware limits
- executive analytics

This repo includes local and production-ready paths:
- Postgres (primary database)
- Redis (cache/session/rate-limit acceleration)
- LocalStack SQS (local queue emulation)
- Stytch (auth)
- Resend (email)
- Next.js App Router UI/API

## Quick Start (One Command)

Run from inside `trustloop`:

```bash
./start.sh
```

This command will:
1. Install all Node packages and libraries (`pnpm install`)
2. Ensure `.env` exists (auto-copied from `.env.example` if missing)
3. Start local infra with Docker Compose (Postgres + Redis + LocalStack)
4. Wait for Postgres/Redis/LocalStack readiness
5. Run Prisma automation commands (`validate`, `generate`, `migrate deploy`, `migrate status`, `db pull --print`)
6. Seed demo data (idempotent)
7. Initialize LocalStack SQS queue
8. Run a worker smoke cycle (`worker:once`)
9. Launch **web app + worker** together
10. Print the local links you should use

If `pnpm` is missing, `start.sh` auto-activates it through `corepack`.

## Expected Local Links

By default (`NEXT_PUBLIC_APP_URL=http://localhost:3000`):
- App: `http://localhost:3000`
- Login: `http://localhost:3000/login`
- Recover Access: `http://localhost:3000/forgot-access`
- Register: `http://localhost:3000/register`
- Dashboard: `http://localhost:3000/dashboard`
- Executive: `http://localhost:3000/executive`
- Settings: `http://localhost:3000/settings`

## Prerequisites

- Node.js 20+
- pnpm 10+
- Docker + Docker Compose

Verify quickly:

```bash
node -v
pnpm -v
docker --version
docker compose version
```

## Environment Variables

Create `.env` from `.env.example` (automatic in `./start.sh` if missing), then set values.

### Required for full functionality
- `NEXT_PUBLIC_APP_URL`
- `DATABASE_URL`
- `REDIS_URL`
- `STYTCH_PROJECT_ID`
- `STYTCH_SECRET`
- `KEY_ENCRYPTION_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

### Local AWS emulation (LocalStack)
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID=test`
- `AWS_SECRET_ACCESS_KEY=test`
- `AWS_ENDPOINT_URL=http://localhost:4566`
- `AWS_ACCOUNT_ID=000000000000`
- `REMINDER_QUEUE_NAME`
- `REMINDER_QUEUE_URL`

## Startup Scripts

- `./start.sh`
  - Main one-command launcher (recommended)
- `pnpm run start:local`
  - Runs the rich local launcher (`scripts/start-local.mjs`)
- `pnpm run start:local:setup`
  - Runs provisioning only (no long-running web/worker processes)
- `pnpm run dev:full`
  - Runs web + worker in parallel
- `pnpm run dev`
  - Web app only
- `pnpm run worker`
  - Worker only

## Manual Local Flow (if you do not use start.sh)

```bash
pnpm install
cp .env.example .env

docker compose -f docker-compose.localstack.yml up -d
pnpm run prisma:validate
pnpm run prisma:generate
pnpm run prisma:deploy
pnpm run prisma:status
pnpm run prisma:pull:print > /tmp/trustloop-prisma-pull.prisma
pnpm run db:seed
pnpm run localstack:init
pnpm run worker:once
pnpm run dev:full
```

## Automated Auth Emails

TrustLoop now sends these auth/onboarding emails through Resend:
- Welcome email right after workspace registration is verified
- Getting-started instructions email after welcome
- OTP security notice email whenever login OTP is requested
- Account recovery instructions email from forgot-access flow
- Existing incident reminder emails remain active

Note: OTP delivery itself is still handled by Stytch (source of truth for verification codes).

## Tech Stack

- Next.js 16 (App Router)
- React 19
- Prisma + PostgreSQL
- Redis (`ioredis`)
- AWS SQS SDK
- Stytch (email OTP + session)
- Resend (transactional/operational emails)
- UI animations: Framer Motion, Motion.dev, GSAP

## Security Notes

AI provider keys entered in Settings are handled with server-side security controls:
- encrypted at rest (AES-256-GCM)
- never logged
- never exposed to the browser after save
- used server-side only

## Production Deployment (AWS via GitHub Actions)

Workflow: `.github/workflows/deploy-aws.yml`

The pipeline now automatically runs required setup commands before deployment:
- starts local Postgres + Redis + LocalStack for CI bootstrap checks
- runs Prisma commands (`validate`, `generate`, `deploy`, `status`, `db pull --print`)
- runs queue setup and a worker smoke cycle
- runs lint + build
- provisions and deploys AWS services (VPC/ECS/RDS/ElastiCache/SQS/ALB/ECR) with Terraform
- runs production Prisma migrations as an ECS one-off task after deploy

## Troubleshooting

### `./start.sh` fails at Docker checks
- Start Docker Desktop/daemon
- Re-run `docker info`

### Migration errors
- Ensure Postgres container is running:
  ```bash
  docker compose -f docker-compose.localstack.yml ps
  ```
- Re-run:
  ```bash
  pnpm run prisma:deploy
  ```

### Worker does not consume queue
- Ensure LocalStack queue exists:
  ```bash
  pnpm run localstack:init
  ```
- Verify `AWS_ENDPOINT_URL=http://localhost:4566`

### Auth or email actions fail locally
- Set valid `STYTCH_*` and `RESEND_*` values in `.env`

## Project Layout

- `src/app` - Next.js routes (UI + API)
- `src/components` - UI components
- `src/lib` - auth, queue, quotas, read models, encryption
- `prisma` - schema and migrations
- `scripts` - local automation helpers
- `infra/terraform` - production infrastructure definitions
