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
1. Install all Node packages and libraries (`npm install`)
2. Ensure `.env` exists (auto-copied from `.env.example` if missing)
3. Start local infra with Docker Compose (Postgres + Redis + LocalStack)
4. Generate Prisma client + apply migrations
5. Seed demo data (idempotent)
6. Initialize LocalStack SQS queue
7. Launch **web app + worker** together
8. Print the local links you should use

## Expected Local Links

By default (`NEXT_PUBLIC_APP_URL=http://localhost:3000`):
- App: `http://localhost:3000`
- Login: `http://localhost:3000/login`
- Register: `http://localhost:3000/register`
- Dashboard: `http://localhost:3000/dashboard`
- Executive: `http://localhost:3000/executive`
- Settings: `http://localhost:3000/settings`

## Prerequisites

- Node.js 20+
- npm 10+
- Docker + Docker Compose

Verify quickly:

```bash
node -v
npm -v
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
- `npm run start:local`
  - Runs the rich local launcher (`scripts/start-local.mjs`)
- `npm run start:local:setup`
  - Runs provisioning only (no long-running web/worker processes)
- `npm run dev:full`
  - Runs web + worker in parallel
- `npm run dev`
  - Web app only
- `npm run worker`
  - Worker only

## Manual Local Flow (if you do not use start.sh)

```bash
npm install
cp .env.example .env

docker compose -f docker-compose.localstack.yml up -d
npm run prisma:generate
npm run prisma:deploy
npm run db:seed
npm run localstack:init
npm run dev:full
```

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

The pipeline provisions and deploys AWS services (VPC/ECS/RDS/ElastiCache/SQS/ALB/ECR) using Terraform and your AWS credentials/secrets from GitHub Actions.

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
  npm run prisma:deploy
  ```

### Worker does not consume queue
- Ensure LocalStack queue exists:
  ```bash
  npm run localstack:init
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
