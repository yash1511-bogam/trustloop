# TrustLoop

TrustLoop is a SaaS for **AI software companies** to run incident operations end-to-end.

This version implements the scaling path:
- Postgres (replacing SQLite)
- Redis for session/cache acceleration
- Autoscaled worker service for SQS reminder jobs
- Tenant-aware rate limiting + per-workspace quotas
- Read models for incident analytics + executive dashboards
- AWS production deployment via GitHub Actions
- Auth via Stytch (OTP)
- Email delivery via Resend

## Stack
- Next.js 16 (App Router)
- Prisma + PostgreSQL
- Redis (`ioredis`)
- Stytch (OTP auth + session validation)
- Resend (operational email delivery)
- AWS SQS (reminder queue)
- LocalStack (local AWS emulation)

## Security model for AI provider keys
- Keys entered in-app and sent to server routes only
- AES-256-GCM encrypted at rest (`KEY_ENCRYPTION_SECRET`)
- Full keys never returned after save (only `last4`)
- Keys never logged by app code
- Keys used server-side only

## Local development

### 1) Install dependencies
```bash
npm install
```

### 2) Configure environment
```bash
cp .env.example .env
```

Set real values for:
- `STYTCH_PROJECT_ID`
- `STYTCH_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `KEY_ENCRYPTION_SECRET`

### 3) Start local infrastructure (Postgres + Redis + LocalStack SQS)
```bash
docker compose -f docker-compose.localstack.yml up -d
```

### 4) Apply migrations
```bash
npm run prisma:deploy
```

### 5) Seed demo data (optional)
```bash
npm run db:seed
```

### 6) Initialize LocalStack queue
```bash
npm run localstack:init
```

### 7) Run the app
```bash
npm run dev
```

### 8) Run worker (optional locally, required in production runner)
```bash
npm run worker
```

Open `http://localhost:3000`.

## Auth flow (Stytch)
- `/register`: email OTP challenge -> verify -> workspace + owner user created
- `/login`: email OTP challenge -> verify -> session cookie minted
- Session token validated against Stytch and cached in Redis

## Quotas and rate limits
Per workspace:
- API requests/minute
- incidents/day
- triage runs/day
- customer update drafts/day
- reminder emails/day

Configurable in Settings (`Workspace quotas`).

## Executive analytics read models
- `IncidentAnalyticsDaily`
- `WorkspaceExecutiveSnapshot`

Displayed at `/executive` and partially on `/dashboard`.

## Scripts
- `npm run dev` - run app
- `npm run lint` - lint checks
- `npm run build` - production build check
- `npm run prisma:generate` - generate Prisma client
- `npm run prisma:migrate` - local migration dev flow
- `npm run prisma:deploy` - apply committed migrations
- `npm run db:seed` - seed demo workspace
- `npm run localstack:init` - create/check reminder queue
- `npm run worker` - run queue worker loop
- `npm run worker:once` - process one worker polling cycle

## Production deployment (AWS + GitHub Actions)
Workflow file: `.github/workflows/deploy-aws.yml`

Deployment provisions and updates:
- VPC + subnets
- ALB
- ECS cluster + web service
- ECS autoscaled worker service (queue-driven)
- RDS PostgreSQL
- ElastiCache Redis
- SQS reminder queue
- ECR image repository

### Required GitHub secrets
AWS auth:
- `AWS_REGION`
- either `AWS_ROLE_TO_ASSUME` (recommended OIDC)
- or `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`

Terraform/app config:
- `TF_VAR_PROJECT_NAME` (optional, defaults `trustloop`)
- `TF_VAR_db_username`
- `TF_VAR_db_password`
- `TF_VAR_stytch_project_id`
- `TF_VAR_stytch_secret`
- `TF_VAR_stytch_env` (optional, defaults `live`)
- `TF_VAR_key_encryption_secret`
- `TF_VAR_resend_api_key`
- `TF_VAR_resend_from_email`

### Deployment behavior
1. Lint/build app
2. Bootstrap ECR via Terraform
3. Build/push Docker image tagged with commit SHA
4. Full Terraform apply with image tag
5. Run `prisma migrate deploy` as one-off ECS task
6. Emit deployed `app_url`

## LocalStack assumptions
For local AWS emulation:
- endpoint: `http://localhost:4566`
- access key: `test`
- secret key: `test`
- services: `sqs`
